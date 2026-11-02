import { useState } from 'react';

interface FadeImageProps {
  src: string;
  alt: string;
  className?: string;
}

function FadeImage({ src, alt, className = '' }: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0) {
          setLoaded(true);
        }
      }}
      src={src}
      alt={alt}
      draggable={false}
      onLoad={() => setLoaded(true)}
      data-loaded={loaded}
      className={`transition-[opacity,scale] duration-300 ease-out ${loaded ? 'scale-100 opacity-100' : 'scale-[1.015] opacity-0'} ${className}`}
    />
  );
}

export { FadeImage };
