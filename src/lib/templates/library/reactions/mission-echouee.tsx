import type { MemeTemplate } from "../../types";
import { Badge, Box, Corridor, Emo, Gauge, Icon, T, Txt, Vignette } from "@/components/meme/kit";

function Render() {
  return (
    <>
      <Box w={1000} h={900} style={{ filter: "grayscale(0.92) brightness(0.62) contrast(1.1)" }}>
        <Corridor w={1000} h={900} floorY={0.36} />
        <Emo id="face-with-crossed-out-eyes" x={372} y={52} size={250} rotate={-100} shadow="ground" />
      </Box>
      <Box w={1000} h={900} bg="linear-gradient(180deg, rgba(60,0,10,0.15) 0%, rgba(20,0,6,0.55) 34%, rgba(10,2,8,0.9) 62%)" />
      <Vignette w={1000} h={900} strength={0.7} color="40,0,8" />

      {/* ATH */}
      <Icon name="heart" x={36} y={32} size={56} color="#ff3b4e" />
      <Gauge x={104} y={42} w={300} h={36} value={0.04} color="#ff3b4e" border="4px solid rgba(255,255,255,0.75)" segments={5} />
      <Txt x={420} y={40} size={34} font="display" color="#fff">
        PV 1/100
      </Txt>
      <Badge x={690} y={34} bg="rgba(10,8,30,0.7)" color="#ff7d8a" size={32} icon="arrow-down" border="3px solid #ff3b4e">
        Aura −1000
      </Badge>

      {/* titre */}
      <Box y={318} w={1000} h={176} bg="linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.82) 18%, rgba(0,0,0,0.82) 82%, rgba(0,0,0,0))" />
      <Box x={150} y={326} w={700} h={5} bg="linear-gradient(90deg, rgba(255,59,78,0), #ff3b4e, rgba(255,59,78,0))" />
      <Box x={150} y={481} w={700} h={5} bg="linear-gradient(90deg, rgba(255,59,78,0), #ff3b4e, rgba(255,59,78,0))" />
      <Txt x={0} y={334} w={1000} align="center" size={128} font="meme" color="#ff3b4e" ls={0.05} lh={1.1} shadow="0 0 34px rgba(255,59,78,0.75), 0 6px 0 #4a0810">
        MISSION ÉCHOUÉE
      </Txt>

      <Txt x={70} y={520} size={32} font="display" color="#ffe94a" ls={0.12}>
        OBJECTIF
      </Txt>
      <T id="mission" x={70} y={560} w={860} h={104} font="display" color="#fff" max={62} min={34} align="left" valign="top" lh={1.08} />
      <Txt x={70} y={678} size={32} font="display" color="#ff7d8a" ls={0.12}>
        {"CAUSE DE L'ÉCHEC"}
      </Txt>
      <T id="cause" x={70} y={718} w={860} h={104} font="display" color="#fff" max={62} min={34} align="left" valign="top" lh={1.08} />

      <Txt x={70} y={842} size={30} font="sans" weight={600} color="rgba(255,255,255,0.6)">
        ▶ Réessayer lundi à 8 h
      </Txt>
      <Txt x={0} y={842} w={930} align="right" size={30} font="sans" weight={600} color="rgba(255,255,255,0.38)">
        Abandonner (indisponible)
      </Txt>
    </>
  );
}

const template: MemeTemplate = {
  id: "mission-echouee",
  name: "Mission échouée",
  category: "reactions",
  width: 1000,
  height: 900,
  fields: [
    { id: "mission", label: "L'objectif", placeholder: "Arriver à l'heure en maths un lundi", maxLength: 60 },
    { id: "cause", label: "Cause de l'échec", placeholder: "« Encore 5 minutes » × 9", maxLength: 60 },
  ],
  Render,
};

export default template;
