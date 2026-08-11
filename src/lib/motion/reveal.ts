"use client";

import { useEffect, useRef, useState } from "react";

/** Quem pediu menos movimento no sistema recebe o valor final direto, sem tween. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/**
 * Progresso 0→1 que só começa quando o bloco entra na tela.
 *
 * Serve para contar números e encher barras: a animação acontece quando a
 * pessoa está olhando, não enquanto a seção ainda está no rodapé. O valor
 * inicial é 0 no servidor e no cliente — é isso que mantém a hidratação
 * casada; o tween só roda depois da montagem.
 */
export function useRevealProgress<T extends HTMLElement>(duration = 1100) {
  const ref = useRef<T | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(1);
      return;
    }

    let frame = 0;
    let started = false;

    function run() {
      if (started) return;
      started = true;

      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setValue(easeOutCubic(p));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }

    const element = ref.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(element);

    // Rede de segurança: em bloco com rolagem própria (canvas livre) ou aba em
    // segundo plano o observer pode não disparar. Sem isso os números ficariam
    // parados em zero.
    const fallback = setTimeout(run, 1500);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, [duration]);

  return { ref, value };
}
