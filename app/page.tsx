import OrderForm from "@/components/order-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-amber-800 dark:text-amber-200 mb-2">Friet Bestellen</h1>
          <p className="text-amber-700 dark:text-amber-300">Verzamel alle bestellingen op één plek</p>
        </div>
        <OrderForm />
      </div>
    </main>
  )
}
