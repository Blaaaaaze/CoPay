export function normalizeItemName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roomLineKey(name: string, participantIds: string[]): string {
  const ids = [...participantIds].sort().join(",");
  return `${normalizeItemName(name)}|${ids}`;
}

export type RoomDraftLine = { name: string; amount: string; participantIds: string[] };

export function mergeDuplicateRoomLines(lines: RoomDraftLine[]): RoomDraftLine[] {
  const map = new Map<string, RoomDraftLine>();
  const unnamed: RoomDraftLine[] = [];
  for (const L of lines) {
    const name = L.name.trim();
    if (!name) {
      unnamed.push(L);
      continue;
    }
    const k = roomLineKey(name, L.participantIds);
    const ex = map.get(k);
    const a = parseFloat(L.amount.replace(",", "."));
    const amt = Number.isFinite(a) && a > 0 ? a : 0;
    if (ex) {
      const prev = parseFloat(ex.amount.replace(",", "."));
      const p = Number.isFinite(prev) ? prev : 0;
      map.set(k, {
        ...ex,
        amount: String(roundMoney(p + amt)),
      });
    } else {
      map.set(k, {
        name: L.name,
        amount: amt > 0 ? String(roundMoney(amt)) : L.amount,
        participantIds: [...L.participantIds],
      });
    }
  }
  return [...map.values(), ...unnamed];
}

export type CalcProductLine = { name: string; price: number; currency: string };

function calcLineKey(name: string, currency: string, participants: string[]): string {
  const p = [...participants].map((x) => x.trim()).filter(Boolean).sort().join("\0");
  return `${normalizeItemName(name)}|${currency}|${p}`;
}

export function mergeProductLinesWithParticipants(
  productLines: CalcProductLine[],
  lineParticipants: string[][]
): { productLines: CalcProductLine[]; lineParticipants: string[][] } {
  const map = new Map<
    string,
    { line: CalcProductLine; participants: string[] }
  >();
  for (let i = 0; i < productLines.length; i++) {
    const L = productLines[i];
    const parts = lineParticipants[i] ?? [];
    const k = calcLineKey(L.name, L.currency, parts);
    const ex = map.get(k);
    if (ex) {
      ex.line.price = roundMoney(ex.line.price + L.price);
    } else {
      map.set(k, {
        line: {
          name: L.name.trim(),
          price: L.price,
          currency: L.currency,
        },
        participants: [...parts],
      });
    }
  }
  const outLines: CalcProductLine[] = [];
  const outParts: string[][] = [];
  for (const v of map.values()) {
    outLines.push(v.line);
    outParts.push(v.participants);
  }
  return { productLines: outLines, lineParticipants: outParts };
}

export function mergeDuplicateProductLines(lines: CalcProductLine[]): CalcProductLine[] {
  const empty: string[][] = lines.map(() => []);
  return mergeProductLinesWithParticipants(lines, empty).productLines;
}
