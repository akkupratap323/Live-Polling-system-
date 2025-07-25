import Head from 'next/head'

export default function Layout({ children }) {
  return (
    <>
      <Head>
        <title>Live Polling System</title>
        <meta name="description" content="Real-time polling system for teachers and students" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>{children}</main>
    </>
  )
}
