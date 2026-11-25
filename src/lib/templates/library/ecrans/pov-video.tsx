import type { MemeTemplate } from "../../types";
import { Comment, Corridor, Emo, T, VideoUI } from "@/components/meme/kit";

function Render() {
  return (
    <>
      <Corridor w={1000} h={1400} floorY={0.7} />
      <Emo id="face-with-peeking-eye" x={236} y={548} size={440} shadow="ground" />
      <VideoUI w={1000} h={1400} user="@le.fond.de.la.classe" desc="#pov #lycée #gênance" likes="213,4 k" comments="4 087" saves="31,2 k" shares="58,9 k" />
      <T id="pov" x={44} y={150} w={912} h={250} font="display" color="#fff" mark="rgba(10,8,30,0.82)" max={78} min={40} lh={1.34} />
      <T id="soustitre" x={50} y={884} w={770} h={130} font="display" color="#ffe94a" outline max={62} min={34} lh={1.06} valign="bottom" />
      <Comment x={36} y={1034} w={800} bubble avatar="skull" avatarBg="#2c2a5a" name="commentaire épinglé" id="commentaire" likes="48,2 k" maxH={96} max={42} min={28} />
    </>
  );
}

const template: MemeTemplate = {
  id: "pov-video",
  name: "POV : la vidéo",
  category: "ecrans",
  width: 1000,
  height: 1400,
  fields: [
    { id: "pov", label: "POV : …", placeholder: "POV : tu croises le prof dont t'as séché le cours", maxLength: 70 },
    { id: "soustitre", label: "Sous-titre", placeholder: "[ devient un casier ]", maxLength: 50 },
    { id: "commentaire", label: "Commentaire épinglé", placeholder: "bro a activé le mode PNJ 💀", maxLength: 60, optional: true },
  ],
  Render,
};

export default template;
