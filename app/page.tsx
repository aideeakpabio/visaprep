import HomeClient from "./home-client";

export default function Page() {
  const testMode =
    (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_");
  return <HomeClient testMode={testMode} />;
}
