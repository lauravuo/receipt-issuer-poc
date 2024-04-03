import { gql } from "graphql-request";

export default gql`
  query GetConnection($id: ID!, $cursor: String) {
    connection(id: $id) {
      id
      ourDid
      theirDid
      theirEndpoint
      theirLabel
      createdMs
      approvedMs
      invited
      events(last: 100, before: $cursor) {
        edges {
          cursor
          node {
            id
            read
            description
            createdMs
            connection {
              id
              theirLabel
            }
            job {
              node {
                id
                protocol
                initiatedByUs
                status
                result
                createdMs
                updatedMs
                output {
                  message {
                    cursor
                    node {
                      id
                      message
                      sentByMe
                      delivered
                      createdMs
                    }
                  }
                }
              }
              cursor
            }
          }
        }
        pageInfo {
          endCursor
          startCursor
          hasPreviousPage
          hasNextPage
        }
      }
    }
  }
`;
