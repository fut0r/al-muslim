import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 122;

function polar(angle: number, radius: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
}

interface QiblahCompassProps {
  /** Qiblah bearing, clockwise from true north. */
  bearing: number;
  /**
   * Device heading from true north, not wrapped at 360° so the dial can turn
   * the short way across north. Null draws a fixed north-up dial.
   */
  rotation: number | null;
  /** True when the device points at the qiblah. */
  aligned: boolean;
  /** Short labels for N, E, S, W in the current language. */
  cardinal: { N: string; E: string; S: string; W: string };
  label: string;
}

/**
 * A compass dial. The dial turns with the device so that the fixed marker at
 * the top always shows where the phone points; the Kaaba marker on the rim
 * shows the qiblah. It is never mirrored for right-to-left languages.
 */
export function QiblahCompass({ bearing, rotation, aligned, cardinal, label }: QiblahCompassProps) {
  const theme = useTheme();
  const { tokens, fonts } = theme.app;
  const live = rotation !== null;

  const accent = tokens.primary;
  const [markerX, markerY] = polar(bearing, RADIUS);
  const [lineX, lineY] = polar(bearing, RADIUS - 20);
  const ticks = Array.from({ length: 72 }, (_, index) => index * 5);
  const labels: Array<[string, number]> = [
    [cardinal.N, 0],
    [cardinal.E, 90],
    [cardinal.S, 180],
    [cardinal.W, 270],
  ];

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label}
      sx={{ width: 'min(78vw, 46vh, 340px)', height: 'auto', display: 'block', mx: 'auto', overflow: 'visible' }}
    >
      {live && (
        <path
          d={`M${CENTER} ${CENTER - RADIUS - 2} l-9 -16 h18 z`}
          fill={aligned ? accent : tokens.text}
          stroke={tokens.background}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      <g
        style={{
          transform: `rotate(${-(rotation ?? 0)}deg)`,
          transformOrigin: `${CENTER}px ${CENTER}px`,
          transition: live ? 'transform 140ms linear' : 'none',
        }}
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill={tokens.surface}
          stroke={aligned ? accent : tokens.divider}
          strokeWidth={aligned ? 3 : 1.5}
        />
        {ticks.map((angle) => {
          const major = angle % 30 === 0;
          const [x1, y1] = polar(angle, RADIUS - 6);
          const [x2, y2] = polar(angle, RADIUS - (major ? 16 : 11));
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={major ? tokens.textSecondary : tokens.divider}
              strokeWidth={major ? 1.5 : 1}
            />
          );
        })}
        {labels.map(([text, angle]) => {
          const [x, y] = polar(angle, RADIUS - 36);
          return (
            <text
              key={angle}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={fonts.heading}
              fontSize="17"
              fontWeight={angle === 0 ? 700 : 500}
              fill={angle === 0 ? tokens.text : tokens.textSecondary}
              transform={`rotate(${angle} ${x} ${y})`}
            >
              {text}
            </text>
          );
        })}
        <line x1={CENTER} y1={CENTER} x2={lineX} y2={lineY} stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={CENTER} cy={CENTER} r="5" fill={accent} />
        {/* The Kaaba marker, kept upright relative to the dial. */}
        <g transform={`translate(${markerX} ${markerY}) rotate(${bearing})`}>
          <circle r="19" fill={accent} stroke={tokens.surface} strokeWidth="3" />
          <path
            transform="translate(-10 -10.4) scale(0.833)"
            d="M4 7.2 12 4l8 3.2v10.6L12 21l-8-3.2V7.2Zm2 1.5v1.6l6 2.4 6-2.4V8.7l-6 2.4-6-2.4Z"
            fill={tokens.onPrimary}
          />
        </g>
      </g>
    </Box>
  );
}
