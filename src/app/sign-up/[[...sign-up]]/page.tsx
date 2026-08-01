import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-5 py-16">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-bg-elevated border border-border shadow-[var(--shadow)]",
          },
        }}
      />
    </div>
  );
}
