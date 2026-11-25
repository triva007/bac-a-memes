import type { MemeTemplate } from "../../types";
import { Box, Emo, Icon, Notif, StatusBar, T, Txt } from "@/components/meme/kit";

function Render() {
  return (
    <>
      {/* fond d'écran */}
      <Box w={1000} h={1150} bg="linear-gradient(165deg, #1b1a4a 0%, #4b2a8a 42%, #c2478f 78%, #ff9a6b 100%)" />
      <Box x={-180} y={640} w={760} h={760} radius="50%" bg="radial-gradient(closest-side, rgba(255,233,74,0.4), rgba(255,233,74,0))" />
      <Box x={520} y={-160} w={700} h={700} radius="50%" bg="radial-gradient(closest-side, rgba(92,200,255,0.35), rgba(92,200,255,0))" />
      <StatusBar time="23:58" battery={0.08} />

      <Icon name="lock" x={470} y={96} size={60} />
      <Txt x={0} y={170} w={1000} align="center" size={44} font="sans" weight={600} color="rgba(255,255,255,0.92)">
        dimanche 11 janvier
      </Txt>
      <Txt x={0} y={206} w={1000} align="center" size={250} font="display" color="#fff" lh={1.1} ls={-0.02} shadow="0 8px 30px rgba(20,10,60,0.35)">
        23:58
      </Txt>

      <Notif x={36} y={528} w={928} h={330} icon="school" iconBg="#7b5cff" app="Vie scolaire" time="maintenant">
        <T id="expediteur" x={32} y={96} w={864} h={60} font="sans" weight={800} max={46} min={28} align="left" nowrap />
        <T id="message" x={32} y={160} w={864} h={150} font="sans" weight={500} max={46} min={30} align="left" valign="top" lh={1.18} />
      </Notif>

      <Notif x={36} y={880} w={928} h={150} icon="alarm-clock" iconBg="#ff9a3d" app="Réveil" time="il y a 2 min" theme="dark">
        <Txt x={32} y={92} size={36} font="sans" weight={600} color="#fbf7ec">
          Sonnerie dans 6 h 02. Bon courage.
        </Txt>
      </Notif>

      <Box x={60} y={1046} w={84} h={84} radius="50%" bg="rgba(20,19,43,0.45)" />
      <Emo id="flashlight" x={76} y={1062} size={52} shadow={false} />
      <Box x={856} y={1046} w={84} h={84} radius="50%" bg="rgba(20,19,43,0.45)" />
      <Icon name="camera" x={874} y={1064} size={48} />
      <Box x={360} y={1122} w={280} h={10} radius={5} bg="rgba(255,255,255,0.85)" />
    </>
  );
}

const template: MemeTemplate = {
  id: "notif-23h58",
  name: "La notif de 23 h 58",
  category: "ecrans",
  width: 1000,
  height: 1150,
  fields: [
    { id: "expediteur", label: "De la part de", placeholder: "Mme Lefèvre", maxLength: 24, kind: "name" },
    { id: "message", label: "Le message", placeholder: "Petit contrôle demain sur les 6 chapitres. Bonne nuit :)", maxLength: 100 },
  ],
  Render,
};

export default template;
