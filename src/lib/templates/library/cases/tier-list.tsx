import type { MemeTemplate } from "../../types";
import { Box, Emo, T, TierRow } from "@/components/meme/kit";
import { C } from "@/components/meme/palette";

const ROW_H = 190;
const TOP = 170;

const TIERS = [
  { label: "S", color: C.pink, field: "s", emoji: "crown" },
  { label: "A", color: C.orange, field: "a", emoji: "fire" },
  { label: "B", color: C.yellow, field: null, emoji: "person-shrugging" },
  { label: "C", color: C.green, field: "c", emoji: "yawning-face" },
  { label: "D", color: C.blue, field: "d", emoji: "wastebasket" },
] as const;

function Render() {
  return (
    <>
      <Box w={1000} h={1140} bg="#0b0a1c" />
      <Box w={1000} h={TOP} bg="linear-gradient(180deg, #2c2a5a, #1b1a36)" />
      <Box x={32} y={22} w={206} h={52} radius={26} bg={C.yellow} />
      <T text="TIER LIST" x={32} y={22} w={206} h={52} font="display" max={32} nowrap />
      <T id="titre" x={32} y={78} w={936} h={84} font="display" color="#fff" upper max={66} min={30} align="left" nowrap />
      {TIERS.map((t, i) => (
        <TierRow key={t.label} y={TOP + i * ROW_H} w={1000} h={ROW_H} label={t.label} color={t.color} labelW={176}>
          {t.field ? (
            <T id={t.field} x={28} y={12} w={640} h={ROW_H - 28} font="display" color="#fff" max={62} min={32} align="left" lh={1.06} />
          ) : (
            <T text="Tout le reste" x={28} y={12} w={640} h={ROW_H - 28} font="display" color="rgba(255,255,255,0.55)" max={62} align="left" />
          )}
          <Emo id={t.emoji} x={690} y={(ROW_H - 124) / 2 - 4} size={124} />
        </TierRow>
      ))}
    </>
  );
}

const template: MemeTemplate = {
  id: "tier-list",
  name: "La tier list",
  category: "cases",
  width: 1000,
  height: 1120,
  fields: [
    { id: "titre", label: "Tier list des…", placeholder: "Excuses pour un retard", maxLength: 34 },
    { id: "s", label: "Tier S (le sommet)", placeholder: "« Mon réveil a rendu l'âme »", maxLength: 46 },
    { id: "a", label: "Tier A", placeholder: "« Y avait pas de bus »", maxLength: 46, optional: true },
    { id: "c", label: "Tier C", placeholder: "« J'étais à l'infirmerie »", maxLength: 46, optional: true },
    { id: "d", label: "Tier D (flop total)", placeholder: "« J'étais là, vous m'avez pas vu »", maxLength: 46 },
  ],
  Render,
};

export default template;
