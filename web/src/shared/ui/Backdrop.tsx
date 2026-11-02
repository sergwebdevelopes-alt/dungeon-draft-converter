interface BackdropProps {
  images: string[];
  index: number;
}

function Backdrop({ images, index }: BackdropProps) {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      {images.map((src, i) => {
        const active = i === index;

        return (
          <img
            key={src}
            src={src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={`absolute inset-0 size-full object-cover transition-[opacity,scale] ease-linear motion-reduce:transition-none ${
              active
                ? 'scale-110 opacity-100 delay-0 duration-[2400ms,14000ms]'
                : 'scale-100 opacity-0 delay-[0ms,2400ms] duration-[2400ms,0ms]'
            }`}
          />
        );
      })}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg)_0%,color-mix(in_srgb,var(--bg)_70%,transparent)_35%,color-mix(in_srgb,var(--bg)_25%,transparent)_70%,color-mix(in_srgb,var(--bg)_55%,transparent)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--bg)_80%,transparent)_0%,transparent_60%)]" />
    </div>
  );
}

export { Backdrop };
