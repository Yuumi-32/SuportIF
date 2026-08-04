import { activityDefs, type PetActivity } from "@/lib/pet/behavior";

/**
 * O Nero de perfil, em três geometrias — de pé, sentado e deitado.
 *
 * Cada pose é um desenho próprio porque um gato sentado não é um gato em pé
 * espremido: muda a silhueta inteira. Dentro de cada pose, o movimento vem de
 * CSS girando grupos (patas no quadril, cabeça no pescoço, rabo na base), o que
 * roda na GPU e não custa quadro de JavaScript.
 *
 * O bicho sempre olha para a direita; quem anda para a esquerda é espelhado com
 * `scaleX(-1)` por quem usa o componente.
 */

const fur = "#171226";
const furFar = "#0f0b1c";
const furLight = "#241c3a";
const eyeAmber = "#f2c14e";
const inner = "#6f4f7d";
const whiskerColor = "#cbc4dd";
const tongue = "#c9748f";

const spriteCss = `
/* Gato preto sobre tema escuro sumia no fundo: este halo é a luz de borda que
   separa a silhueta. No tema claro ele é imperceptível. */
.cat-sprite { filter: drop-shadow(0 0 1.6px hsl(var(--violet-300) / 0.7)); }
.cat-part { transform-box: view-box; }
.cat-walk .cat-leg-fl { animation: cat-step 0.58s linear infinite; }
.cat-walk .cat-leg-fr { animation: cat-step 0.58s linear infinite -0.29s; }
.cat-walk .cat-leg-bl { animation: cat-step 0.58s linear infinite -0.29s; }
.cat-walk .cat-leg-br { animation: cat-step 0.58s linear infinite; }
.cat-walk .cat-body-bob { animation: cat-bob 0.29s ease-in-out infinite alternate; }
.cat-run .cat-leg-fl,
.cat-run .cat-leg-fr,
.cat-run .cat-leg-bl,
.cat-run .cat-leg-br { animation-duration: 0.3s; }
.cat-run .cat-body-bob { animation-duration: 0.15s; }
.cat-tail-idle { animation: cat-tail 3.4s ease-in-out infinite; }
.cat-tail-happy { animation: cat-tail-happy 0.9s ease-in-out infinite; }
.cat-breathe { animation: cat-breathe 3.6s ease-in-out infinite; }
.cat-groom-head { animation: cat-groom 1.1s ease-in-out infinite; }
.cat-stretch-body { animation: cat-stretch 2.2s ease-in-out; }
.cat-ear-twitch { animation: cat-ear 5.2s ease-in-out infinite; }
.cat-blink { transform-box: fill-box; transform-origin: center; animation: cat-blink 6.4s ease-in-out infinite; }

@keyframes cat-step {
  0%, 100% { transform: rotate(-17deg); }
  50% { transform: rotate(17deg); }
}
@keyframes cat-bob {
  from { transform: translateY(0); }
  to { transform: translateY(-1.6px); }
}
@keyframes cat-tail {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(9deg); }
}
@keyframes cat-tail-happy {
  0%, 100% { transform: rotate(-14deg); }
  50% { transform: rotate(16deg); }
}
@keyframes cat-breathe {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.045); }
}
@keyframes cat-groom {
  0%, 100% { transform: rotate(0deg); }
  45% { transform: rotate(26deg); }
  60% { transform: rotate(22deg); }
}
@keyframes cat-stretch {
  0%, 100% { transform: scaleX(1) translateY(0); }
  45% { transform: scaleX(1.14) translateY(3px); }
}
@keyframes cat-ear {
  0%, 88%, 100% { transform: rotate(0deg); }
  92% { transform: rotate(-13deg); }
  96% { transform: rotate(6deg); }
}
@keyframes cat-blink {
  0%, 94%, 100% { transform: scaleY(1); }
  97% { transform: scaleY(0.1); }
}
@media (prefers-reduced-motion: reduce) {
  .cat-part, .cat-blink { animation: none !important; }
}
`;

type EyeShape = "open" | "closed" | "happy" | "squint";
type MouthShape = "closed" | "open" | "wide";

/**
 * Rosto de perfil. O olho de trás aparece só como sugestão — é o que dá a
 * leitura de "três quartos" sem precisar de outro desenho.
 */
function CatFace({
  hx,
  hy,
  eyes,
  mouth,
  blink
}: {
  hx: number;
  hy: number;
  eyes: EyeShape;
  mouth: MouthShape;
  blink: boolean;
}) {
  return (
    <g>
      {/* O focinho é da mesma cor do pelo: ele faz parte da silhueta, em vez de
          virar aquela mancha clara no meio da cara. */}
      <ellipse cx={hx + 10} cy={hy + 6} rx={8.5} ry={7} fill={fur} />

      {eyes === "open" ? (
        <g className={blink ? "cat-blink" : undefined}>
          {/* Um olho só, e pequeno: ocupando um terço da cabeça ele virava ovo frito. */}
          <ellipse
            cx={hx + 2}
            cy={hy - 1}
            rx={4.2}
            ry={3.8}
            fill={eyeAmber}
            transform={`rotate(-14 ${hx + 2} ${hy - 1})`}
          />
          <ellipse cx={hx + 2.4} cy={hy - 1} rx={1.2} ry={3} fill="#120e1e" />
          <circle cx={hx + 3.4} cy={hy - 2.6} r={0.9} fill="#fff" opacity={0.85} />
        </g>
      ) : eyes === "happy" ? (
        <path
          d={`M${hx - 2} ${hy - 1}c2-4 7-4 9 0`}
          fill="none"
          stroke={eyeAmber}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ) : eyes === "squint" ? (
        <path
          d={`M${hx - 2} ${hy - 2}h9`}
          stroke={eyeAmber}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M${hx - 2} ${hy - 3}c2 4 7 4 9 0`}
          fill="none"
          stroke={eyeAmber}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}

      <path d={`M${hx + 18} ${hy + 2}l-4-2.5v5Z`} fill="#a4718f" />

      {mouth === "closed" ? (
        <path
          d={`M${hx + 15} ${hy + 6}c-2 2.5-5 2-6 0`}
          fill="none"
          stroke="#6d6486"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      ) : (
        <g>
          <ellipse
            cx={hx + 12}
            cy={hy + (mouth === "wide" ? 10 : 9)}
            rx={mouth === "wide" ? 4.6 : 3.4}
            ry={mouth === "wide" ? 5.2 : 3.4}
            fill="#2a2140"
          />
          <ellipse cx={hx + 12} cy={hy + 10} rx={2} ry={1.7} fill={tongue} />
        </g>
      )}

      {/* Bigodes curtos e finos: os longos viravam espinho na cara. */}
      <path
        d={`M${hx + 15} ${hy + 3}l8-3M${hx + 15} ${hy + 5}l8 1`}
        stroke={whiskerColor}
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.6}
      />
    </g>
  );
}

/**
 * Orelha dormindo não é orelha em pé girada: gato relaxado abaixa e abre as
 * orelhas para os lados, então a pose deitada tem triângulos próprios.
 */
function Ears({ hx, hy, flat, twitch }: { hx: number; hy: number; flat: boolean; twitch: boolean }) {
  if (flat) {
    return (
      <g>
        <path
          d={`M${hx - 10} ${hy - 7}L${hx - 21} ${hy - 12}L${hx - 5} ${hy - 13}Z`}
          fill={fur}
          stroke={fur}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path
          d={`M${hx + 2} ${hy - 9}L${hx + 13} ${hy - 15}L${hx + 12} ${hy - 4}Z`}
          fill={fur}
          stroke={fur}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d={`M${hx + 5} ${hy - 9}L${hx + 10} ${hy - 12}L${hx + 10} ${hy - 6}Z`} fill={inner} opacity={0.7} />
      </g>
    );
  }

  return (
    <g className={twitch ? "cat-part cat-ear-twitch" : undefined} style={{ transformOrigin: `${hx}px ${hy}px` }}>
      {/* A orelha de trás é menor e mais escura: é profundidade, não um segundo
          espeto do mesmo tamanho. O contorno é fino para elas não incharem. */}
      <path
        d={`M${hx - 11} ${hy - 9}L${hx - 13} ${hy - 19}L${hx - 3} ${hy - 13}Z`}
        fill={furFar}
        stroke={furFar}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path
        d={`M${hx + 3} ${hy - 11}L${hx + 8} ${hy - 21}L${hx + 14} ${hy - 10}Z`}
        fill={fur}
        stroke={fur}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path
        d={`M${hx + 5.5} ${hy - 12}L${hx + 8} ${hy - 17.5}L${hx + 11} ${hy - 11}Z`}
        fill={inner}
        opacity={0.85}
      />
    </g>
  );
}

/**
 * Faixa reta atravessando o pescoço, desenhada ANTES da cabeça — a cabeça cobre
 * a parte de cima e sobra só o trecho de baixo, que é como uma coleira aparece
 * de perfil. O arco curvo de antes ficava solto sob o queixo e lia como sorriso.
 *
 * `angle` é a inclinação do pescoço naquela pose.
 */
function Collar({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <path
      transform={`rotate(${angle} ${x} ${y})`}
      d={`M${x - 9} ${y}H${x + 9}`}
      stroke="hsl(var(--violet-600))"
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
}

function Leg({
  x,
  hipY,
  footY,
  width,
  color,
  className
}: {
  x: number;
  hipY: number;
  footY: number;
  width: number;
  color: string;
  className: string;
}) {
  return (
    <path
      className={`cat-part ${className}`}
      style={{ transformOrigin: `${x}px ${hipY}px` }}
      d={`M${x} ${hipY}V${footY}`}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function QuadPose({
  eyes,
  mouth,
  tailClass,
  headAngle,
  blink,
  stretching
}: {
  eyes: EyeShape;
  mouth: MouthShape;
  tailClass: string;
  headAngle: number;
  blink: boolean;
  stretching: boolean;
}) {
  return (
    <g className={stretching ? "cat-part cat-stretch-body" : undefined} style={{ transformOrigin: "34px 76px" }}>
      <path
        className={`cat-part ${tailClass}`}
        style={{ transformOrigin: "34px 54px" }}
        d="M34 54C16 52 8 38 18 27"
        fill="none"
        stroke={fur}
        strokeWidth={7}
        strokeLinecap="round"
      />

      <Leg x={44} hipY={62} footY={86} width={7} color={furFar} className="cat-leg-bl" />
      <Leg x={92} hipY={60} footY={86} width={7} color={furFar} className="cat-leg-fl" />

      <g className="cat-part cat-body-bob">
        <path
          d="M40 70C30 70 25 60 29 50C34 39 52 35 70 35C88 35 102 39 106 49C110 59 104 70 96 70Z"
          fill={fur}
        />
        <g transform={`rotate(${headAngle} 100 46)`}>
          {/* Pescoço: sem ele a cabeça parecia colada no lombo. */}
          <path d="M92 52C92 42 98 36 106 36L108 50Z" fill={fur} />
          <Collar x={100} y={45} angle={41} />
          <circle cx="106" cy="34" r="15" fill={fur} />
          <Ears hx={106} hy={34} flat={false} twitch />
          <CatFace hx={106} hy={32} eyes={eyes} mouth={mouth} blink={blink} />
        </g>
      </g>

      <Leg x={50} hipY={64} footY={88} width={8.5} color={fur} className="cat-leg-br" />
      <Leg x={98} hipY={62} footY={88} width={8.5} color={fur} className="cat-leg-fr" />
      <ellipse cx="50" cy="87" rx="6" ry="3" fill={furLight} />
      <ellipse cx="98" cy="87" rx="6" ry="3" fill={furLight} />
    </g>
  );
}

function SitPose({
  eyes,
  mouth,
  tailClass,
  headAngle,
  blink,
  grooming
}: {
  eyes: EyeShape;
  mouth: MouthShape;
  tailClass: string;
  headAngle: number;
  blink: boolean;
  grooming: boolean;
}) {
  return (
    <g>
      <path
        className={`cat-part ${tailClass}`}
        style={{ transformOrigin: "34px 80px" }}
        d="M34 80C14 82 14 94 36 91C52 89 62 89 72 89"
        fill="none"
        stroke={fur}
        strokeWidth={7}
        strokeLinecap="round"
      />

      {/* Perna da frente de trás fica antes do peito, senão some atrás dele. */}
      <path d="M80 60V86" stroke={furFar} strokeWidth={7} strokeLinecap="round" />

      <ellipse cx="52" cy="70" rx="26" ry="18" fill={fur} />
      {/* O peito para em y=82 de propósito: é o que deixa as patas aparecerem. */}
      <path d="M50 82C44 66 50 50 66 45C80 41 90 45 93 55C96 65 94 74 90 82Z" fill={fur} />

      <path d="M88 60V87" stroke={fur} strokeWidth={8.5} strokeLinecap="round" />
      <ellipse cx="88" cy="86" rx="6" ry="3" fill={furLight} />
      <ellipse cx="66" cy="87" rx="8" ry="4" fill={furLight} opacity={0.7} />

      <g
        className={grooming ? "cat-part cat-groom-head" : undefined}
        style={{ transformOrigin: "94px 50px" }}
        transform={`rotate(${headAngle} 94 50)`}
      >
        <path d="M86 52C86 42 90 36 98 36L100 52Z" fill={fur} />
        <Collar x={93} y={45} angle={37} />
        <circle cx="96" cy="32" r="15" fill={fur} />
        <Ears hx={96} hy={32} flat={false} twitch />
        <CatFace hx={96} hy={30} eyes={eyes} mouth={mouth} blink={blink} />
      </g>
    </g>
  );
}

function LiePose() {
  return (
    <g>
      <path
        className="cat-part cat-tail-idle"
        style={{ transformOrigin: "30px 84px" }}
        d="M30 84C12 86 14 96 38 92"
        fill="none"
        stroke={fur}
        strokeWidth={7}
        strokeLinecap="round"
      />

      <g className="cat-part cat-breathe" style={{ transformOrigin: "62px 88px" }}>
        <path d="M26 88C18 72 32 60 60 60C86 60 106 66 110 79C111 85 107 88 100 88Z" fill={fur} />
        <circle cx="102" cy="70" r="13" fill={fur} />
        <Ears hx={102} hy={70} flat twitch={false} />
        <ellipse cx="110" cy="74" rx="7" ry="6" fill={fur} />
        <path
          d="M98 69c2 3 6 3 8 0"
          fill="none"
          stroke={eyeAmber}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path d="M117 71l-3.5-2v4Z" fill="#a4718f" />
        <path
          d="M114 72l7-2"
          stroke={whiskerColor}
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={0.55}
        />
        {/* Sem coleira deitado: o pescoço some dentro do pão de gato. */}
        <path d="M92 87h20" stroke={furLight} strokeWidth={5} strokeLinecap="round" />
      </g>
    </g>
  );
}

function eyesFor(activity: PetActivity): EyeShape {
  if (activity === "sleep") return "closed";
  if (activity === "cuddle") return "happy";
  if (activity === "groom") return "closed";
  if (activity === "yawn") return "squint";
  if (activity === "eat") return "closed";
  return "open";
}

function mouthFor(activity: PetActivity): MouthShape {
  if (activity === "yawn") return "wide";
  if (activity === "beg" || activity === "eat") return "open";
  return "closed";
}

export function CatSprite({
  activity,
  headAngle = 0,
  className
}: {
  activity: PetActivity;
  /** Inclinação da cabeça, usada para ele acompanhar o cursor. */
  headAngle?: number;
  className?: string;
}) {
  const pose = activityDefs[activity].pose;
  const moving = activity === "walk" || activity === "chase";
  const eyes = eyesFor(activity);
  const mouth = mouthFor(activity);
  const blink = eyes === "open";
  const tailClass =
    activity === "chase" || activity === "cuddle" || activity === "beg"
      ? "cat-tail-happy"
      : "cat-tail-idle";

  const rootClass = [
    "cat-sprite",
    className,
    moving ? "cat-walk" : "",
    activity === "chase" ? "cat-run" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: spriteCss }} />
      <svg viewBox="0 0 132 96" className={rootClass} role="img" aria-label={`Gato preto ${activity}`}>
        {pose === "quad" && (
          <QuadPose
            eyes={eyes}
            mouth={mouth}
            tailClass={tailClass}
            headAngle={activity === "eat" ? 18 : headAngle}
            blink={blink}
            stretching={activity === "stretch"}
          />
        )}
        {pose === "sit" && (
          <SitPose
            eyes={eyes}
            mouth={mouth}
            tailClass={tailClass}
            headAngle={headAngle}
            blink={blink}
            grooming={activity === "groom"}
          />
        )}
        {pose === "lie" && <LiePose />}
      </svg>
    </>
  );
}
