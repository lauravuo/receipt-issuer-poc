import Agent from "./Agent";

const seller = {
  img: "https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144",
  name: "Seppo Seller",
  role: "seller",
};

const buyer = {
  img: "https://images.unsplash.com/photo-1549078642-b2ba4bda0cdb?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144",
  name: "Pertti Buyer",
  role: "buyer",
};

export default function Root() {
  return (
    <div className="flex flex-row w-full items-center justify-around mt-20">
      <div className="flex-1">
        <Agent name="seller" me={seller} friend={buyer} showInvitation={true} />
      </div>
      <div className="flex-1">
        <Agent name="buyer" me={buyer} friend={seller} showInvitation={false} />
      </div>
    </div>
  );
}
