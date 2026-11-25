import type { MemeTemplate } from "../../types";
import { Box, Icon, IfField, Notif, StatusBar, T, Txt } from "@/components/meme/kit";
import { FONT } from "@/components/meme/palette";

const INK = "#14132b";

function Render() {
  return (
    <>
      {/* fond d'écran verrouillé */}
      <Box w={1000} h={1280} bg="linear-gradient(165deg, #23206b 0%, #5a2a86 45%, #c0457e 78%, #f59a5c 100%)" />
      <Box x={-160} y={760} w={620} h={620} radius="50%" bg="radial-gradient(closest-side, rgba(255,233,74,0.35), rgba(255,233,74,0))" />
      <Box x={560} y={-120} w={640} h={640} radius="50%" bg="radial-gradient(closest-side, rgba(92,200,255,0.3), rgba(92,200,255,0))" />
      <StatusBar time="17:42" battery={0.12} />

      <Icon name="lock" x={476} y={92} size={48} color="rgba(255,255,255,0.9)" />
      <Txt x={0} y={150} w={1000} align="center" size={42} weight={600} color="rgba(255,255,255,0.92)">
        mardi, jour du bulletin
      </Txt>
      <Txt x={0} y={192} w={1000} align="center" size={210} font="display" weight={700} color="#fff" lh={1} ls={-0.02}>
        17:42
      </Txt>

      {/* appels manqués */}
      <Notif x={30} y={432} w={940} h={226} icon="telephone-receiver" iconBg="#34d17a" app="Téléphone" time="à l'instant">
        <T id="qui" x={34} y={92} w={690} h={66} font="sans" weight={800} max={54} min={30} align="left" color={INK} nowrap />
        <div style={{ position: "absolute", left: 34, top: 158, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.sans, fontWeight: 800, fontSize: 40, color: "#e5383b", whiteSpace: "nowrap" }}>
          <Icon name="phone" inline size={40} color="#e5383b" style={{ transform: "rotate(135deg)" }} />
          12 appels manqués
        </div>
        <div style={{ position: "absolute", left: 764, top: 84, width: 124, height: 124, borderRadius: "50%", background: "#e5383b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.meme, fontSize: 78, boxShadow: "0 6px 0 rgba(0,0,0,0.18)" }}>
          12
        </div>
      </Notif>

      {/* le message qui suit */}
      <Notif x={30} y={682} w={940} h={318} icon="speech-balloon" iconBg="#7b5cff" app="Messages" time="à l'instant">
        <T id="qui" x={34} y={90} w={872} h={50} font="sans" weight={800} max={38} min={26} align="left" color="rgba(20,19,43,0.7)" nowrap />
        <T id="msg" x={34} y={142} w={872} h={160} font="sans" weight={700} max={60} min={32} align="left" valign="top" color={INK} lh={1.14} />
      </Notif>

      {/* le deuxième message, ou la batterie */}
      <IfField id="msg2">
        <Notif x={30} y={1024} w={940} h={196} icon="speech-balloon" iconBg="#7b5cff" app="Messages" time="à l'instant">
          <T id="msg2" x={34} y={90} w={872} h={94} font="sans" weight={700} max={52} min={30} align="left" valign="top" color={INK} lh={1.14} />
        </Notif>
      </IfField>
      <IfField id="msg2" not>
        <Notif x={30} y={1024} w={940} h={196} icon="low-battery" iconBg="#14132b" app="Batterie" time="17:40">
          <Txt x={34} y={94} size={44} weight={800} color={INK}>
            2 % restants.
          </Txt>
          <Txt x={34} y={146} size={34} weight={500} color="rgba(20,19,43,0.7)">
            Comme ta marge de négociation.
          </Txt>
        </Notif>
      </IfField>

      <Box x={350} y={1248} w={300} h={10} radius={5} bg="rgba(255,255,255,0.85)" />
    </>
  );
}

const template: MemeTemplate = {
  id: "appels-manques",
  name: "Les 12 appels manqués",
  category: "ecrans",
  width: 1000,
  height: 1280,
  fields: [
    { id: "qui", label: "Qui t'appelle ?", placeholder: "Maman", maxLength: 24, kind: "name" },
    { id: "msg", label: "Le message qui suit", placeholder: "Réponds. Je viens de voir ta moyenne de maths.", maxLength: 90 },
    { id: "msg2", label: "Et le suivant (facultatif)", placeholder: "Ok. On en parle ce soir.", maxLength: 50, optional: true },
  ],
  Render,
};

export default template;
