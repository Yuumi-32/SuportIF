import { activityDefs, type PetActivity } from "@/lib/pet/behavior";
import { buildWalkRuns, spriteHeight, spriteWidth, walkFrameCount } from "@/lib/pet/pixel-sprite";

/**
 * O Nero em pixel art, do kit "Nero 16-bit".
 *
 * Os 8 quadros ficam lado a lado dentro do SVG, como numa folha de sprites de
 * verdade, e a caminhada é a folha deslizando com `steps(8)` — nenhum quadro é
 * interpolado, que é o ponto do estilo. Fora andar e correr, o bicho fica no
 * quadro 1 parado.
 *
 * Ele sempre olha para frente; espelhar só troca o lado da cauda.
 */

const frames = buildWalkRuns();
const sheetWidth = spriteWidth * walkFrameCount;

const spriteCss = `
.nero-folha {
  animation: nero-andar var(--nero-ciclo, 1s) steps(${walkFrameCount}) infinite;
}
@keyframes nero-andar {
  from { transform: translateX(0); }
  to { transform: translateX(-${sheetWidth}px); }
}
@media (prefers-reduced-motion: reduce) {
  .nero-folha { animation: none; }
}
`;

/** Duração de um ciclo completo. O kit nasceu em 8 quadros por segundo. */
const cycleSeconds: Partial<Record<PetActivity, number>> = {
  walk: 1,
  chase: 0.5
};

function Frame({ index }: { index: number }) {
  return (
    <g transform={`translate(${index * spriteWidth} 0)`}>
      {frames[index].map((run) => (
        <rect
          key={`${run.y}-${run.x}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={1}
          fill={run.color}
        />
      ))}
    </g>
  );
}

export function CatSprite({ activity, className }: { activity: PetActivity; className?: string }) {
  const cycle = cycleSeconds[activity];
  const moving = cycle !== undefined && activityDefs[activity].moves;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: spriteCss }} />
      <svg
        viewBox={`0 0 ${spriteWidth} ${spriteHeight}`}
        className={className}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Nero, gato de estimação — ${moving ? "andando" : "parado"}`}
      >
        {moving ? (
          <g className="nero-folha" style={{ ["--nero-ciclo" as string]: `${cycle}s` }}>
            {frames.map((_, index) => (
              <Frame key={index} index={index} />
            ))}
          </g>
        ) : (
          <Frame index={0} />
        )}
      </svg>
    </>
  );
}
