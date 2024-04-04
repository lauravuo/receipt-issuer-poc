#!/bin/bash

set -e

current_dir=$(dirname "$BASH_SOURCE")

read_timeout="60s"
timestamp=$(date +%s)
register_wait_time=60

bot_name=$BOT_USER
if [ -z "$bot_name" ]; then
  echo "Bot not defined, creating new..."
  bot_name="bot-$timestamp"
fi

if [ -z "$AGENCY_URL" ]; then
  echo "Define AGENCY_URL"
  exit 1
fi

if [ ! -f ".envrc" ]; then
  # fetch needed env variables from agency deployment
  source /dev/stdin <<<"$(curl -sS $AGENCY_URL/set-env.sh)"
  echo 'export AGENCY_URL="'$AGENCY_URL'"' >>.envrc
fi

echo "Running issuer bot for $FCLI_URL (origin: $FCLI_ORIGIN, api: $FCLI_SERVER)"

# register bot agent
if [ -z "$BOT_USER" ]; then
  echo "Register bot_name $bot_name"
  if [ -z "$BOT_USER_SEED" ]; then
    findy-agent-cli authn register -u $bot_name
  else
    findy-agent-cli authn register -u $bot_name --seed $BOT_USER_SEED
  fi
  # wait for onboard transaction to be written to ledger
  sleep $register_wait_time

  echo 'export BOT_USER="'$bot_name'"' >>.envrc
  echo 'export FCLI_USER="$BOT_USER"' >>.envrc
fi

# login bot_name
echo "Login bot_name $bot_name"
bot_name_jwt=$(findy-agent-cli authn login -u $bot_name)
echo 'export FCLI_JWT="'$bot_name_jwt'"' >>.envrc

cred_def_id=$BOT_CRED_DEF_ID
sch_id=$BOT_SCHEMA_ID
if [ -z "$BOT_CRED_DEF_ID" ]; then
  if [ -z "$sch_id" ]; then
    # create schema
    echo "Create schema"
    sch_id=$(findy-agent-cli agent create-schema --jwt $bot_name_jwt --name="receipt" --version=1.0 merchant price)
  fi

  # read schema - make sure it's found in ledger
  echo "Read schema"
  schema=$(findy-agent-cli agent get-schema --jwt $bot_name_jwt --schema-id $sch_id --timeout $read_timeout)

  if [ -z "$schema" ]; then
    echo "Schema creation failed."
    exit 1
  fi

  echo 'export BOT_SCHEMA_ID="'$sch_id'"' >>.envrc

  echo "Schema read successfully: $schema"

  # create cred def
  echo "Create cred def with schema id $sch_id"
  cred_def_id=$(findy-agent-cli agent create-cred-def --jwt $bot_name_jwt --id $sch_id --tag $bot_name)

  # read cred def - make sure it's found in ledger
  echo "Read cred def"
  cred_def=$(findy-agent-cli agent get-cred-def --jwt $bot_name_jwt --id $cred_def_id --timeout $read_timeout)

  echo "Cred def read successfully: $cred_def"

  echo 'export BOT_CRED_DEF_ID="'$cred_def_id'"' >>.envrc
  echo 'export FCLI_CRED_DEF_ID="'$cred_def_id'"' >>.envrc
fi

did=$BOT_DID
if [ -z "$did" ]; then
  did=$(echo $(cut -d "." -f 2 <<<$FCLI_JWT | base64 --decode)"}" | jq .un)
  echo 'export BOT_DID='$did >>.envrc
fi


pub_url="$AGENCY_URL/dyn?did=$did&label=issuer-bot&url=yes"
echo "Fetch bot invitation from $pub_url"

# make sure all the needed env variables are set
source .envrc

findy-agent-cli bot start --service-fsm issuing-service-b-fsm.yaml issuing-service-f-fsm.yaml -v=1
