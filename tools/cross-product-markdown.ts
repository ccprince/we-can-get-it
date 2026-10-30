import type { CrossProduct, GoodsHidden, Problem, Report, Spread, Survey } from '../src/engine';

/**
 * The cross-product report as Markdown. This only **formats** what the engine
 * returns as data (ADR 0007 decision 18): no rule and no judgement lives here,
 * so a section is as wrong as the engine's data and no more. The sections are
 * documented in `content/README.md`, which is where a writer looks.
 *
 * Problems and reports are never conflated: each is listed under the verdict
 * it carries (#10).
 */
export type Subject = {
  readonly contentPath: string;
  /** The seed the galaxy was drawn with, or null for the content set alone. */
  readonly seed: number | null;
  /** What the loader said, which is where a mistake and a suspicion first come apart. */
  readonly problems: readonly Problem[];
  readonly reports: readonly Report[];
  /** Why the draw gave no galaxy, when a seed was asked for and it gave none. */
  readonly drawProblems: readonly Problem[];
  /** Null when the content set would not load. */
  readonly crossProduct: CrossProduct | null;
};

export function markdown(subject: Subject): string {
  const { crossProduct } = subject;
  const lines = [
    `# Cross-product report: ${subject.contentPath}`,
    '',
    subject.seed === null
      ? 'Over the content set as written. Pass `--seed` to report over a drawn galaxy as well.'
      : `Over the content set as written, and over the galaxy seed ${subject.seed} draws.`,
    '',
    ...verdicts(subject),
    ...(crossProduct === null ? [] : sections(crossProduct)),
  ];
  return `${lines.join('\n').trimEnd()}\n`;
}

function verdicts(subject: Subject): readonly string[] {
  const problems = [...subject.problems, ...subject.drawProblems];
  return [
    '## Problems',
    '',
    'Mistakes. Each fails the load or the draw.',
    '',
    ...entries(problems, 'none'),
    '',
    '## Reports from the load',
    '',
    'Suspicions, for a writer to judge. Never a reason to fail.',
    '',
    ...entries(subject.reports, 'none'),
    '',
  ];
}

function sections(crossProduct: CrossProduct): readonly string[] {
  const { asWritten, drawn } = crossProduct;
  return [
    ...motifSlots(crossProduct),
    ...motifLayouts(crossProduct),
    ...survey('As written', asWritten),
    ...(drawn === null
      ? []
      : [
          ...survey('Drawn', drawn),
          ...goodsHidden(drawn.goodsHidden),
          '## Drawn: slots placed',
          '',
          ...(drawn.placed.length === 0
            ? ['- none']
            : drawn.placed.map(
                ({ motif, slot, location, archetype }) =>
                  `- \`${motif}\` / \`${slot}\`: ${location} (${archetype})`,
              )),
          '',
          '## Drawn: inter-motif stretch',
          '',
          'Each lane between motifs, most stretched first: drawn length against distance.',
          '',
          ...(drawn.interMotifStretch.length === 0
            ? ['- none']
            : drawn.interMotifStretch.map(
                ({ ends, distance, drawn: length }) =>
                  `- ${ends[0]} to ${ends[1]}: distance ${distance}, drawn ${length.toFixed(2)}`,
              )),
          '',
        ]),
  ];
}

function goodsHidden({
  declaredPercent,
  inCirculation,
  hidden,
  hiddenPercent,
  drawnBack,
}: GoodsHidden): readonly string[] {
  return [
    '## Drawn: goods hidden',
    '',
    'Of the goods of the kinds in circulation, how many the draw hid, against the rate declared; ' +
      'then each good it drew back after hiding it: one a buyer wants by name, ' +
      'or to keep a kind’s floor or a role tag’s least.',
    '',
    `- hidden ${hidden} of ${inCirculation} (${hiddenPercent}%) ` +
      `against ${declaredPercent}% declared; ${drawnBack.length} drawn back`,
    ...drawnBack.map((back) =>
      'wantedBy' in back
        ? `- drawn back: \`${back.good}\`, wanted by name by ${back.wantedBy}`
        : 'floor' in back
          ? `- drawn back: \`${back.good}\`, for the floor of ${back.floor}`
          : `- drawn back: \`${back.good}\`, for the role tag ${back.roleTag}`,
    ),
    '',
  ];
}

function motifSlots({ slots, archetypes }: CrossProduct): readonly string[] {
  const motifs = [...new Set(slots.map(({ motif }) => motif))];
  return [
    '## Motif Slots',
    '',
    'How many reserve locations can fill each slot. Having enough matters, not which ones.',
    '',
    ...motifs.flatMap((motif) => [
      `### \`${motif}\``,
      '',
      ...slots
        .filter((one) => one.motif === motif)
        .map(
          ({ slot, archetype, locations }) =>
            `- \`${slot}\` (${archetype ?? 'untyped'}): ` +
            `${locations} ${locations === 1 ? 'location' : 'locations'}`,
        ),
      '',
    ]),
    '### Locations by archetype',
    '',
    ...(archetypes.length === 0
      ? ['- none']
      : archetypes.map(
          ({ archetype, locations }) => `- ${archetype}: ${locations.join(', ') || 'none'}`,
        )),
    '',
  ];
}

function motifLayouts({ motifLayouts: laidOut }: CrossProduct): readonly string[] {
  return [
    '## Motif layouts',
    '',
    "Each motif's worst distortion, worst first, and each lane's drawn length against its " +
      'distance.',
    '',
    ...laidOut.flatMap(({ motif, lanes, worstDistortion }) => [
      `### \`${motif}\`: worst distortion ${worstDistortion.toFixed(2)}`,
      '',
      ...(lanes.length === 0
        ? ['- no lanes']
        : lanes.map(
            ({ ends, distance, drawn }) =>
              `- \`${ends[0]}\` to \`${ends[1]}\`: distance ${distance}, drawn ${drawn.toFixed(2)}`,
          )),
      '',
    ]),
  ];
}

function survey(name: string, surveyed: Survey): readonly string[] {
  return [
    `## ${name}: goods per kind`,
    '',
    ...distribution(surveyed.goodsPerKind),
    '',
    `## ${name}: goods per role tag`,
    '',
    ...distribution(surveyed.goodsPerRoleTag),
    '',
    `## ${name}: prose missing the tells of a tag the good holds`,
    '',
    ...entries(surveyed.missingTells, 'none'),
    '',
    `## ${name}: prose carrying the tells of a tag the good does not hold`,
    '',
    ...entries(surveyed.strayTells, 'none'),
    '',
  ];
}

function distribution(counted: Spread): readonly string[] {
  if (counted.length === 0) return ['- none'];
  return counted.map(
    ({ goods, tags }) => `- ${goods} ${goods === 1 ? 'good' : 'goods'}: ${tags.join(', ')}`,
  );
}

function entries(found: readonly (Problem | Report)[], none: string): readonly string[] {
  if (found.length === 0) return [`- ${none}`];
  return found.map(({ verdict, where, what }) => `- **${verdict}** \`${where}\` ${what}`);
}
