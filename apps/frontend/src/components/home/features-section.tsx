// features-section.tsx
'use client'

export function FeaturesSection() {
  const features = [
    { icon: 'shield_lock',          title: 'Bảo mật tuyệt đối',   description: 'Dữ liệu được mã hóa quân sự và chia nhỏ trên mạng lưới phi tập trung.',                          color: 'text-amber-500' },
    { icon: 'verified',             title: 'Xác thực AI',          description: 'Tự động nhận diện và phân loại tài liệu thông minh bằng trí tuệ nhân tạo.',                      color: 'text-blue-400'  },
    { icon: 'account_balance_wallet',title: 'Blockchain native',   description: 'Lưu vết mọi giao dịch và thay đổi trên sổ cái bất biến của blockchain.',                         color: 'text-indigo-500'},
    { icon: 'auto_awesome',         title: 'Dễ dàng sử dụng',     description: 'Giao diện tối giản, thân thiện giúp bạn quản lý tài liệu chỉ với vài cú click.',                  color: 'text-amber-500' },
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold text-white">Tính năng bảo mật tối ưu</h2>
          <p className="text-base text-muted-foreground">
            Giải pháp lưu trữ tài liệu thế hệ mới cho kỷ nguyên số.
          </p>
        </div>
        <button className="text-amber-500 font-bold flex items-center gap-1 hover:underline">
          Xem tất cả tính năng
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-card border border-border p-6 rounded-xl
                       flex flex-col gap-4
                       hover:border-amber-500/50 transition-colors
                       group"
            // transition-colors thay vì transform → nhẹ hơn nhiều
            // KHÔNG dùng group-hover:scale trên toàn card — chỉ icon
          >
            <div
              className={`w-12 h-12 rounded-lg bg-amber-500/10
                         flex items-center justify-center ${feature.color}
                         transition-transform duration-200
                         group-hover:scale-110
                         will-change-transform`}
              // will-change chỉ trên icon nhỏ, không phải cả card
            >
              <span className="material-symbols-outlined text-2xl">
                {feature.icon}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1 text-white">{feature.title}</h3>
              <p className="text-base text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}