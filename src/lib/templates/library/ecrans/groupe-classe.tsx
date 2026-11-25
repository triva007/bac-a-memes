import type { MemeTemplate } from "../../types";
import { Box, ChatBubble, ChatColumn, ChatHeader, ChatInput, ChatNote, StatusBar } from "@/components/meme/kit";

function Render() {
  return (
    <>
      <Box w={1000} h={72} bg="#1e1d40" />
      <StatusBar time="23:47" battery={0.12} />
      <ChatHeader y={72} title="Terminale B 🎓 sans profs" subtitle="32 membres · 31 en ligne" avatar="graduation-cap" />
      <ChatColumn y={222} w={1000} h={908} gap={18}>
        <ChatNote>{"Aujourd'hui"}</ChatNote>
        <ChatBubble name="La déléguée" nameColor="#5df2a0" avatar="nerd-face" avatarBg="#5df2a0" text="Rappel : le DM de maths est pour demain 8 h 🙂" time="23:41" />
        <ChatBubble name="Enzo" nameColor="#5cc8ff" avatar="face-with-spiral-eyes" avatarBg="#ff9a3d" text="quel DM" time="23:42" />
        <ChatBubble nameId="auteur" nameColor="#ffe94a" avatar="smiling-face-with-sunglasses" avatarBg="#ff5fa2" id="message" time="23:45" maxW={690} maxH={236} max={48} />
        <ChatBubble side="out" id="reponse" time="23:47" checks maxW={690} maxH={236} max={48} />
        <ChatNote>Vu par 31 personnes · 0 réponse utile</ChatNote>
      </ChatColumn>
      <ChatInput y={1130} />
    </>
  );
}

const template: MemeTemplate = {
  id: "groupe-classe",
  name: "Le groupe de la classe",
  category: "ecrans",
  width: 1000,
  height: 1250,
  fields: [
    { id: "auteur", label: "Qui écrit ?", placeholder: "Mathis", maxLength: 16, kind: "name" },
    { id: "message", label: "Son message", placeholder: "qqn peut m'envoyer le DM ? juste pour comparer", maxLength: 90 },
    { id: "reponse", label: "Ta réponse", placeholder: "comparer avec quoi frérot", maxLength: 90 },
  ],
  Render,
};

export default template;
