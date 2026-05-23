// highlight-section.tsx
'use client'

export function HighlightSection() {
  return (
    <section className="relative h-96 rounded-xl overflow-hidden group">
      <img 
        alt="Future of storage" 
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC..."
        width={1200}
        height={384}
        // lazy   → chỉ load khi gần scroll tới — tiết kiệm RAM lúc đầu
        // async  → decode ảnh không block main thread
        // will-change-transform → GPU layer cho hover scale
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover
                   transition-transform duration-700
                   group-hover:scale-105
                   will-change-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent
                      flex items-center px-8">
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-bold text-white">
            Quyền riêng tư là ưu tiên hàng đầu
          </h2>
          <p className="text-base text-zinc-300">
            Chúng tôi không bao giờ có thể truy cập tài liệu của bạn.
            Chỉ có bạn nắm giữ chìa khóa duy nhất cho kho lưu trữ của mình.
          </p>
          <button className="bg-white text-black font-bold px-6 py-2 rounded-lg
                             hover:bg-zinc-200 transition-colors">
            Khám phá công nghệ mã hóa
          </button>
        </div>
      </div>
    </section>
  )
}