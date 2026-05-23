'use client'

export function InteractiveCube() {
  const faces = [
    { name: 'front',  icon: 'lock' },
    { name: 'back',   icon: 'database' },
    { name: 'right',  icon: 'shield' },
    { name: 'left',   icon: 'hub' },
    { name: 'top',    icon: 'cloud_sync' },
    { name: 'bottom', icon: 'fingerprint' },
  ]

  return (
    <div className="scene">
      <div className="cube">
        <div className="data-core" />
        {faces.map(({ name, icon }) => (
          <div key={name} className={`cube__face cube__face--${name}`}>
            <span className="material-symbols-outlined text-6xl text-amber-500/40">
              {icon}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
