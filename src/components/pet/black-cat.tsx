import type { PetMood } from "@/lib/pet/state";
import { getPetPose } from "@/lib/pet/state";

/**
 * O gato preto, desenhado em SVG para acompanhar a personalização do tema (a
 * coleira usa a cor da marca) e não depender de arquivo de imagem.
 *
 * O humor manda no rosto, nas orelhas e na velocidade do rabo; `reaction` é o
 * efeito momentâneo de cada ação de cuidado. As animações desligam quando o
 * sistema pede menos movimento.
 */
export type PetReaction = "none" | "hearts" | "eat" | "play";

const petCatCss = `
.pet-cat__eye {
  transform-box: fill-box;
  transform-origin: center;
  animation: pet-cat-blink 7s ease-in-out infinite;
}
.pet-cat__eye--right {
  animation-delay: 0.08s;
}
.pet-cat__tail {
  transform-box: view-box;
  transform-origin: 176px 196px;
  animation: pet-cat-tail var(--pet-tail-speed, 4.5s) ease-in-out infinite;
}
.pet-cat__float {
  animation: pet-cat-float 2.6s ease-in-out infinite;
}
.pet-cat__heart {
  animation: pet-cat-heart 1.4s ease-out forwards;
}
.pet-cat__treat {
  animation: pet-cat-treat 1.1s ease-in forwards;
}
.pet-cat__yarn {
  transform-box: view-box;
  transform-origin: 196px 200px;
  animation: pet-cat-yarn 1.2s ease-in-out;
}
@keyframes pet-cat-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.08); }
}
@keyframes pet-cat-tail {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(7deg); }
}
@keyframes pet-cat-float {
  0%, 100% { transform: translateY(0); opacity: 0.75; }
  50% { transform: translateY(-6px); opacity: 1; }
}
@keyframes pet-cat-heart {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: translateY(-54px) scale(1.1); opacity: 0; }
}
@keyframes pet-cat-treat {
  0% { transform: translate(0, -86px) scale(1); opacity: 0; }
  20% { transform: translate(0, -64px) scale(1); opacity: 1; }
  75% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(0, 4px) scale(0.2); opacity: 0; }
}
@keyframes pet-cat-yarn {
  0% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(-58px) rotate(-220deg); }
  100% { transform: translateX(0) rotate(-360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .pet-cat__eye,
  .pet-cat__tail,
  .pet-cat__float,
  .pet-cat__heart,
  .pet-cat__treat,
  .pet-cat__yarn {
    animation: none;
  }
}
`;

const furDark = "#171226";
const furLight = "#241c3a";
const eyeAmber = "#f2c14e";
const whisker = "#cbc4dd";
const mouthLine = "#6d6486";

function OpenEye({ cx, side }: { cx: number; side: "left" | "right" }) {
  const eyeClass = side === "right" ? "pet-cat__eye pet-cat__eye--right" : "pet-cat__eye";

  return (
    <>
      <ellipse className={eyeClass} cx={cx} cy={83} rx={12} ry={14} fill={eyeAmber} />
      <ellipse className={eyeClass} cx={cx} cy={83} rx={3.4} ry={11} fill="#120e1e" />
      <circle cx={cx + 4} cy={77} r={2.4} fill="#fff" opacity={0.85} />
    </>
  );
}

function ClosedEye({ cx, curve }: { cx: number; curve: "happy" | "sleepy" }) {
  const d =
    curve === "happy"
      ? `M${cx - 11} 87c4-9 18-9 22 0`
      : `M${cx - 11} 81c4 9 18 9 22 0`;

  return <path d={d} fill="none" stroke={eyeAmber} strokeWidth={4.5} strokeLinecap="round" />;
}

function Mouth({ mood }: { mood: PetMood }) {
  if (mood === "hungry") {
    return (
      <>
        <ellipse cx={120} cy={114} rx={7} ry={6} fill="#2a2140" stroke={mouthLine} strokeWidth={2} />
        <ellipse cx={120} cy={117} rx={4} ry={3} fill="#b9718f" />
      </>
    );
  }

  if (mood === "worried") {
    return (
      <path
        d="M110 114c4-5 6-5 10 0c4 5 6 5 10 0"
        fill="none"
        stroke={mouthLine}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  }

  if (mood === "sleepy") {
    return <path d="M114 112h12" stroke={mouthLine} strokeWidth={2.5} strokeLinecap="round" />;
  }

  return (
    <path
      d="M120 108c0 5-4 8-9 7M120 108c0 5 4 8 9 7"
      fill="none"
      stroke={mouthLine}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  );
}

function Hearts() {
  return (
    <g>
      {[
        { x: 92, y: 60, delay: "0s", scale: 1 },
        { x: 148, y: 52, delay: "0.18s", scale: 0.8 },
        { x: 120, y: 44, delay: "0.36s", scale: 0.65 }
      ].map((heart) => (
        <path
          key={heart.x}
          className="pet-cat__heart"
          style={{ animationDelay: heart.delay }}
          transform={`translate(${heart.x} ${heart.y}) scale(${heart.scale})`}
          d="M0 6c-6-6-12-10-12-16a7 7 0 0 1 12-5a7 7 0 0 1 12 5c0 6-6 10-12 16Z"
          fill="hsl(var(--violet-500))"
        />
      ))}
    </g>
  );
}

function Zzz() {
  return (
    <g className="pet-cat__float" fill="hsl(var(--violet-500))" fontWeight={800} fontFamily="inherit">
      <text x={182} y={48} fontSize={22}>
        z
      </text>
      <text x={200} y={30} fontSize={15}>
        z
      </text>
    </g>
  );
}

export function BlackCat({
  mood = "content",
  collarLabel,
  reaction = "none",
  reactionKey = 0,
  className
}: {
  mood?: PetMood;
  collarLabel?: string;
  reaction?: PetReaction;
  /** Muda a cada ação para o SVG remontar e a animação recomeçar. */
  reactionKey?: number;
  className?: string;
}) {
  const pose = getPetPose(mood);
  const eyes = reaction === "hearts" ? "happy" : pose.eyes;
  const earTilt = mood === "sleepy" ? 15 : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: petCatCss }} />
      <svg
        viewBox="0 0 240 240"
        className={className}
        style={{ ["--pet-tail-speed" as string]: `${pose.tailSpeedSeconds}s` }}
        role="img"
        aria-label={`Gato preto de estimação, ${mood === "sleepy" ? "sonolento" : "acordado"}`}
      >
        <ellipse cx="120" cy="218" rx="88" ry="10" fill="hsl(var(--slate-950))" opacity="0.07" />

        <path
          className="pet-cat__tail"
          d="M172 200C214 204 226 170 206 150C195 139 180 146 183 160"
          fill="none"
          stroke={furDark}
          strokeWidth="17"
          strokeLinecap="round"
        />

        <path
          d="M120 96C78 96 58 140 56 196C55 208 62 215 74 215H166C178 215 185 208 184 196C182 140 162 96 120 96Z"
          fill={furDark}
        />

        <ellipse cx="93" cy="207" rx="21" ry="10" fill={furLight} />
        <ellipse cx="147" cy="207" rx="21" ry="10" fill={furLight} />
        <path
          d="M93 200v8M86 201v6M100 201v6M147 200v8M140 201v6M154 201v6"
          stroke={furDark}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
        />

        <g transform={`rotate(${-earTilt} 78 58)`}>
          <path d="M78 58L71 21L108 45Z" fill={furDark} stroke={furDark} strokeWidth="8" strokeLinejoin="round" />
          <path d="M83 52L79 33L98 46Z" fill="#6f4f7d" opacity="0.85" />
        </g>
        <g transform={`rotate(${earTilt} 162 58)`}>
          <path d="M162 58L169 21L132 45Z" fill={furDark} stroke={furDark} strokeWidth="8" strokeLinejoin="round" />
          <path d="M157 52L161 33L142 46Z" fill="#6f4f7d" opacity="0.85" />
        </g>

        <path
          d="M120 38C89 38 66 58 66 85C66 113 90 132 120 132C150 132 174 113 174 85C174 58 151 38 120 38Z"
          fill={furDark}
        />

        {pose.alert && (
          <path
            d="M84 60L106 68M156 60L134 68"
            stroke="#e4dff0"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}

        {eyes === "open" ? (
          <>
            <OpenEye cx={99} side="left" />
            <OpenEye cx={141} side="right" />
          </>
        ) : (
          <>
            <ClosedEye cx={99} curve={eyes} />
            <ClosedEye cx={141} curve={eyes} />
          </>
        )}

        <path d="M120 108L112 100H128Z" fill="#a4718f" />
        <Mouth mood={reaction === "eat" ? "hungry" : mood} />

        <path
          d="M78 92L52 84M78 100L54 100M162 92L188 84M162 100L186 100"
          stroke={whisker}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />

        <path
          d="M86 122C97 133 143 133 154 122"
          fill="none"
          stroke="hsl(var(--violet-600))"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <circle
          cx="120"
          cy="135"
          r="8"
          fill="hsl(var(--violet-300))"
          stroke="hsl(var(--violet-600))"
          strokeWidth="2"
        />
        {collarLabel && (
          <text
            x="120"
            y="138.5"
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            fill="hsl(var(--violet-900))"
            fontFamily="inherit"
          >
            {collarLabel}
          </text>
        )}

        {mood === "sleepy" && reaction === "none" && <Zzz />}

        <g key={reactionKey}>
          {reaction === "hearts" && <Hearts />}
          {reaction === "eat" && (
            <g className="pet-cat__treat">
              <ellipse cx="120" cy="112" rx="11" ry="7" fill="#e8a33d" />
              <path d="M131 112l9-6v12Z" fill="#c9822a" />
            </g>
          )}
          {reaction === "play" && (
            <g className="pet-cat__yarn">
              <circle cx="196" cy="200" r="14" fill="hsl(var(--violet-400))" />
              <path
                d="M186 194c8 4 14 10 18 16M190 189c8 3 16 11 19 18M183 201c6 3 11 7 14 12"
                fill="none"
                stroke="hsl(var(--violet-700))"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
      </svg>
    </>
  );
}
