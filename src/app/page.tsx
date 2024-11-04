import Link from "next/link";

const IndexPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
      <h1 className="text-4xl mb-8">Package Manager</h1>
      <Link href="/login">      
        <button className="px-4 py-2 bg-foreground text-background rounded">Go to Login</button>
      </Link>
    </div>
  );
}

export default IndexPage;
