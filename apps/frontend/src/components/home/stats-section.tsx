'use client'

export function StatsSection() {
  const stats = [
    {
      number: '1.2M+',
      label: 'Tài liệu đã lưu'
    },
    {
      number: '99.9%',
      label: 'Thời gian duy trì'
    },
    {
      number: '0',
      label: 'Rò rỉ dữ liệu'
    },
    {
      number: '50k+',
      label: 'Người dùng tin dùng'
    }
  ]

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
          <p className="text-4xl font-bold text-amber-500">{stat.number}</p>
          <p className="text-sm text-zinc-400">{stat.label}</p>
        </div>
      ))}
    </section>
  )
}
