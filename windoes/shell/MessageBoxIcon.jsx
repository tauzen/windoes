/**
 * Message box icons, drawn for Windoes as 32x32 pixel art in the 98 style.
 * Nothing here is copied, traced or extracted from Microsoft icons.
 *
 * Each icon is 32 rows of 32 characters; each character is one pixel and
 * names a colour in PALETTE. `.` is transparent.
 */
const PALETTE = {
  k: '#000000',
  w: '#ffffff',
  g: '#808080',
  r: '#ff0000',
  m: '#800000',
  y: '#ffff00',
  b: '#0000ff',
};

const ICONS = {
  error: [
    '..........mmmmmmmmm.............',
    '........mmrrrrrrrrrmm...........',
    '......mmrrrrrrrrrrrrrmm.........',
    '.....mrrrrrrrrrrrrrrrrrm........',
    '....mrrrrrrrrrrrrrrrrrrrm.......',
    '...mrrrrrrrrrrrrrrrrrrrrrm......',
    '..mrrrrrrrrrrrrrrrrrrrrrrrm.....',
    '..mrrrrrrrrrrrrrrrrrrrrrrrmg....',
    '.mrrrrrrwwrrrrrrrrrwwrrrrrrmg...',
    '.mrrrrrrwwwrrrrrrrwwwrrrrrrmg...',
    'mrrrrrrrrwwwrrrrrwwwrrrrrrrrmg..',
    'mrrrrrrrrrwwwrrrwwwrrrrrrrrrmg..',
    'mrrrrrrrrrrwwwrwwwrrrrrrrrrrmgg.',
    'mrrrrrrrrrrrwwwwwrrrrrrrrrrrmgg.',
    'mrrrrrrrrrrrrwwwrrrrrrrrrrrrmgg.',
    'mrrrrrrrrrrrwwwwwrrrrrrrrrrrmgg.',
    'mrrrrrrrrrrwwwrwwwrrrrrrrrrrmgg.',
    'mrrrrrrrrrwwwrrrwwwrrrrrrrrrmgg.',
    'mrrrrrrrrwwwrrrrrwwwrrrrrrrrmgg.',
    '.mrrrrrrwwwrrrrrrrwwwrrrrrrmggg.',
    '.mrrrrrrwwrrrrrrrrrwwrrrrrrmggg.',
    '..mrrrrrrrrrrrrrrrrrrrrrrrmggg..',
    '..mrrrrrrrrrrrrrrrrrrrrrrrmggg..',
    '...mrrrrrrrrrrrrrrrrrrrrrmggg...',
    '....mrrrrrrrrrrrrrrrrrrrmgggg...',
    '.....mrrrrrrrrrrrrrrrrrmgggg....',
    '......mmrrrrrrrrrrrrrmmgggg.....',
    '.......gmmrrrrrrrrrmmggggg......',
    '........ggmmmmmmmmmgggggg.......',
    '..........ggggggggggggg.........',
    '............ggggggggg...........',
    '................................',
  ],
  warning: [
    '................................',
    '.............kk.................',
    '.............kk.................',
    '............kyykg...............',
    '............kyykg...............',
    '...........kyyyykg..............',
    '...........kyyyykg..............',
    '..........kyyyyyykg.............',
    '..........kyyyyyykg.............',
    '.........kyyyyyyyykg............',
    '.........kyyykkkyykg............',
    '........kyyyykkkyyykg...........',
    '........kyyyykkkyyykg...........',
    '.......kyyyyykkkyyyykg..........',
    '.......kyyyyykkkyyyykg..........',
    '......kyyyyyykkkyyyyykg.........',
    '......kyyyyyykkkyyyyykg.........',
    '.....kyyyyyyykkkyyyyyykg........',
    '.....kyyyyyyykkkyyyyyykg........',
    '....kyyyyyyyyykyyyyyyyykg.......',
    '....kyyyyyyyyykyyyyyyyykg.......',
    '...kyyyyyyyyyykyyyyyyyyykg......',
    '...kyyyyyyyyyyyyyyyyyyyykg......',
    '..kyyyyyyyyyykkkyyyyyyyyykg.....',
    '..kyyyyyyyyyykkkyyyyyyyyykg.....',
    '.kyyyyyyyyyyykkkyyyyyyyyyykg....',
    '.kyyyyyyyyyyyyyyyyyyyyyyyykg....',
    'kyyyyyyyyyyyyyyyyyyyyyyyyyykg...',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkk...',
    '..gggggggggggggggggggggggggggg..',
    '..ggggggggggggggggggggggggggggg.',
    '................................',
  ],
  info: [
    '............kkkkkkk.............',
    '.........kkkwwwwwwwkkk..........',
    '........kwwwwwwwwwwwwwk.........',
    '......kkwwwwwwwwwwwwwwwkk.......',
    '.....kwwwwwwwwwwwwwwwwwwwk......',
    '.....kwwwwwwwwwbbwwwwwwwwkg.....',
    '....kwwwwwwwwwbbbbwwwwwwwwkg....',
    '...kwwwwwwwwwwwbbwwwwwwwwwwk....',
    '...kwwwwwwwwwwwwwwwwwwwwwwwkg...',
    '...kwwwwwwwwwwwwwwwwwwwwwwwkgg..',
    '..kwwwwwwwwwbbbbbbwwwwwwwwwwkg..',
    '..kwwwwwwwwwwwbbbbwwwwwwwwwwkg..',
    '..kwwwwwwwwwwwbbbbwwwwwwwwwwkgg.',
    '..kwwwwwwwwwwwbbbbwwwwwwwwwwkgg.',
    '..kwwwwwwwwwwwbbbbwwwwwwwwwwkgg.',
    '..kwwwwwwwwwwwbbbbwwwwwwwwwwkgg.',
    '..kwwwwwwwwwwwbbbbwwwwwwwwwwkgg.',
    '...kwwwwwwwwwwbbbbwwwwwwwwwkggg.',
    '...kwwwwwwwwwwbbbbwwwwwwwwwkggg.',
    '...kwwwwwwwwwwbbbbwwwwwwwwwkgg..',
    '....kwwwwwwwbbbbbbbbwwwwwwkggg..',
    '.....kwwwwwwbbbbbbbbwwwwwkgggg..',
    '.....kwwwwwwwwwwwwwwwwwwwkggg...',
    '......kwwwwwwwwwwwwwwwwkkggg....',
    '.......kwwwwwwwwwwwwwwkggggg....',
    '......kwwwkkwwwwwwwkkkggggg.....',
    '......kwwkggkkkkkkkgggggg.......',
    '.....kwwkggggggggggggggg........',
    '.....kwkgggg..ggggggg...........',
    '....kwkgggg.....................',
    '....kk.ggg......................',
    '......ggg.......................',
  ],
};

/** One rect per run of same-coloured pixels in a row. */
function toRects(rows) {
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const color = row[x];
      let end = x + 1;
      while (row[end] === color) end++;
      if (color !== '.') rects.push({ x, y, width: end - x, fill: PALETTE[color] });
      x = end;
    }
  });
  return rects;
}

const RECTS = Object.fromEntries(
  Object.entries(ICONS).map(([name, rows]) => [name, toRects(rows)])
);

/**
 * @param {{ name: string, id?: string }} props `name` is error, warning or info.
 */
export default function MessageBoxIcon({ name, id }) {
  return (
    <svg
      className="dialog-icon"
      id={id}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      aria-hidden={true}
    >
      {(RECTS[name] || RECTS.error).map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.width} height="1" fill={r.fill} />
      ))}
    </svg>
  );
}
