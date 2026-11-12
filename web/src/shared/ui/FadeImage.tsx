import { useState } from 'react';

interface FadeImageProps {
  src: string;
  alt: string;
  className?: string;
  fade?: boolean;
}

const FADING = 'transition-[opacity,scale] duration-300 ease-out';
const WAITING = 'scale-[1.015] opacity-0';
const SHOWN = 'scale-100 opacity-100';

function FadeImage({ src, alt, className = '', fade = true }: FadeImageProps) {
  const [fades] = useState(fade);
  const [loaded, setLoaded] = useState(!fade);

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
      className={`${fades ? FADING : ''} ${loaded ? SHOWN : WAITING} ${className}`}
    />
  );
}

export { FadeImage };
