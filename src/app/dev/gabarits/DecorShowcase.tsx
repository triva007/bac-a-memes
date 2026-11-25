"use client";

import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  BedroomNight,
  Blackboard,
  Box,
  Bubble,
  Bus,
  Canteen,
  ChatBubble,
  ChatColumn,
  ChatHeader,
  ChatInput,
  ChatNote,
  Classroom,
  Comment,
  Confetti,
  CopieDouble,
  Corridor,
  CpeOffice,
  Emo,
  ExamHall,
  Gauge,
  Gym,
  Halftone,
  Icon,
  LiveBadge,
  Lockers,
  NewsBanner,
  Notif,
  Paper,
  Phone,
  Pin,
  PostIt,
  RedCircle,
  Ribbon,
  SchoolDesk,
  Seyes,
  Stamp,
  StatBar,
  StatusBar,
  Sunburst,
  T,
  Tape,
  TierRow,
  Txt,
  Underline,
  VideoUI,
  WallClock,
  Window,
  WoodTable,
  Yard,
  type IconName,
} from "@/components/meme/kit";

/** Canevas virtuel 1000 × h réduit à `width` px, pour montrer les briques du kit hors gabarit. */
function DevCanvas({ h, width = 500, label, children }: { h: number; width?: number; label: string; children: ReactNode }) {
  const s = width / 1000;
  return (
    <figure data-decor={label} style={{ width }} className="shrink-0">
      <figcaption className="mb-1 text-xs font-semibold text-[#5df2a0]">{label}</figcaption>
      <div style={{ width, height: h * s, position: "relative", overflow: "hidden", borderRadius: 12, background: "#14132b" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1000, height: h, transform: `scale(${s})`, transformOrigin: "0 0" }}>{children}</div>
      </div>
    </figure>
  );
}

const ICONS: IconName[] = ["heart", "comment", "share", "bookmark", "send", "search", "mic", "camera", "back", "more", "phone", "video", "check", "checks", "pin", "play", "lock", "bell", "eye", "plus", "close", "music", "flag", "star", "clock", "user", "arrow-up", "arrow-down", "bolt", "smile"];

export function DecorShowcase() {
  return (
    <section data-section="decors" className="flex flex-col gap-6">
      <h2 className="font-display text-3xl font-extrabold text-[#ffe94a]">Décors du kit</h2>
      <div className="flex flex-wrap gap-4">
        <DevCanvas h={700} label="<Classroom> + <Blackboard> + <SchoolDesk> + <WallClock>">
          <Classroom w={1000} h={700} />
          <Blackboard x={60} y={50} w={640} h={330}>
            <T text="Interro surprise !" x={20} y={20} w={564} h={250} font="hand2" color="#f6f3e7" max={90} />
          </Blackboard>
          <WallClock x={790} y={70} size={130} time="08:05" />
          <Emo id="melting-face" x={380} y={330} size={260} />
          <SchoolDesk x={300} y={530} w={420} />
        </DevCanvas>
        <DevCanvas h={700} label="<Corridor> (casiers)">
          <Corridor w={1000} h={700} />
          <Emo id="yawning-face" x={380} y={330} size={260} shadow="ground" />
        </DevCanvas>
        <DevCanvas h={700} label="<Canteen> (self)">
          <Canteen w={1000} h={700} />
          <Emo id="nauseated-face" x={380} y={130} size={220} />
        </DevCanvas>
        <DevCanvas h={700} label="<Yard> (cour)">
          <Yard w={1000} h={700} />
          <Emo id="smiling-face-with-sunglasses" x={380} y={380} size={240} shadow="ground" />
        </DevCanvas>
        <DevCanvas h={700} label="<Gym> (gymnase)">
          <Gym w={1000} h={700} />
          <Emo id="hot-face" x={380} y={360} size={240} shadow="ground" />
        </DevCanvas>
        <DevCanvas h={700} label="<BedroomNight> (chambre, 2 h du mat)">
          <BedroomNight w={1000} h={700} />
          <Emo id="face-with-spiral-eyes" x={390} y={300} size={260} />
        </DevCanvas>
        <DevCanvas h={700} label="<Bus>">
          <Bus w={1000} h={700} />
          <Emo id="sleeping-face" x={150} y={250} size={220} />
          <Emo id="zany-face" x={640} y={250} size={220} />
        </DevCanvas>
        <DevCanvas h={700} label="<CpeOffice> (bureau du CPE)">
          <CpeOffice w={1000} h={700}>
            <Emo id="face-with-raised-eyebrow" x={390} y={240} size={230} />
          </CpeOffice>
        </DevCanvas>
        <DevCanvas h={700} label="<ExamHall> (salle d'examen)">
          <ExamHall w={1000} h={700} />
        </DevCanvas>
        <DevCanvas h={700} label="<Window> ×4, <Lockers>, <WoodTable>">
          <WoodTable w={1000} h={700} />
          <Window x={40} y={40} w={200} h={240} sky="day" />
          <Window x={280} y={40} w={200} h={240} sky="night" />
          <Window x={520} y={40} w={200} h={240} sky="rain" />
          <Window x={760} y={40} w={200} h={240} sky="sunset" />
          <Lockers x={40} y={360} w={920} h={300} n={7} />
        </DevCanvas>
      </div>

      <h2 className="font-display text-3xl font-extrabold text-[#ffe94a]">Formats papier</h2>
      <div className="flex flex-wrap gap-4">
        <DevCanvas h={760} label="<Seyes>, <CopieDouble>, <PostIt>, <Tape>, <Pin>, <Stamp>, <RedCircle>, <Underline>">
          <WoodTable w={1000} h={760} />
          <CopieDouble x={40} y={40} w={560} h={680} rotate={-2}>
            <Txt x={170} y={52} size={46} font="hand" color="#2338a8">
              Contrôle de maths
            </Txt>
            <Underline x={170} y={104} w={300} />
            <Txt x={400} y={170} size={90} font="hand" color="#e5383b">
              3/20
            </Txt>
            <RedCircle x={380} y={160} w={190} h={120} />
          </CopieDouble>
          <Seyes x={640} y={60} w={320} h={300} margin={60} rotate={3} />
          <Tape x={720} y={36} />
          <PostIt x={660} y={420} w={260} h={260}>
            <Txt x={20} y={30} w={220} size={44} font="hand" align="center">
              Rendre le DM !!!
            </Txt>
          </PostIt>
          <Pin x={770} y={400} />
          <Stamp x={150} y={520} text="Vu" sub="vie scolaire" />
        </DevCanvas>
        <DevCanvas h={760} label="<Bubble> ×3, <Paper>, <Ribbon>, <Sunburst>, <Halftone>, <Confetti>">
          <Sunburst w={1000} h={760} />
          <Halftone w={1000} h={760} />
          <Confetti w={1000} h={760} />
          <Bubble x={60} y={60} w={420} h={170} tail="bottom-left">
            <T text="Parole" w={420} h={170} font="display" />
          </Bubble>
          <Bubble x={540} y={60} w={400} h={170} kind="thought" tail="bottom-right">
            <T text="Pensée" w={400} h={170} font="display" />
          </Bubble>
          <Bubble x={160} y={330} w={380} h={150} tail="left" fill="#ffe94a">
            <T text="De côté" w={380} h={150} font="display" />
          </Bubble>
          <Paper x={600} y={330} w={320} h={220} rotate={4}>
            <Txt x={30} y={30} size={40} font="type">
              Papier uni
            </Txt>
          </Paper>
          <Ribbon x={200} y={600} w={600} h={110}>
            <T text="Bandeau" w={600} h={110} font="display" color="#fff" max={70} />
          </Ribbon>
        </DevCanvas>
      </div>

      <h2 className="font-display text-3xl font-extrabold text-[#ffe94a]">Interfaces</h2>
      <div className="flex flex-wrap gap-4">
        <DevCanvas h={1300} label="<StatusBar>, <ChatHeader>, <ChatColumn>, <ChatBubble>, <ChatNote>, <ChatInput>">
          <Box w={1000} h={70} bg="#1e1d40" />
          <StatusBar />
          <ChatHeader y={70} title="Terminale B 🎓" subtitle="32 membres, 9 en ligne" />
          <ChatColumn y={220} w={1000} h={960}>
            <ChatNote>Aujourd&apos;hui</ChatNote>
            <ChatBubble name="Inès" avatar="nerd-face" text="Quelqu'un a les réponses du DM ?" time="23:41" />
            <ChatBubble name="Tom" nameColor="#5df2a0" avatar="smiling-face-with-sunglasses" avatarBg="#ff5fa2" text="Quel DM" time="23:42" />
            <ChatBubble side="out" text="Y'avait un DM ???" time="23:42" checks />
          </ChatColumn>
          <ChatInput y={1180} />
        </DevCanvas>
        <DevCanvas h={1300} label="<VideoUI>, <Comment>, <LiveBadge>, sous-titres (T mark)">
          <Corridor w={1000} h={1300} floorY={0.7} />
          <Emo id="face-with-peeking-eye" x={300} y={520} size={360} shadow="ground" />
          <VideoUI w={1000} h={1300} user="@terminale.b" desc="jour 47 sans faire mes devoirs" />
          <LiveBadge x={36} y={130} />
          <T text="POV : le prof rend les copies" x={60} y={230} w={760} h={200} font="display" color="#fff" mark="rgba(0,0,0,0.78)" max={70} />
          <Comment x={36} y={900} w={800} bubble name="la_cpe_officiel" meta="2 h" pinned text="On en reparle lundi." likes="12,4 k" />
        </DevCanvas>
        <DevCanvas h={1300} label="<Notif>, <Phone>, <Badge>, <Gauge>, <StatBar>, <Avatar>, <TierRow>, <NewsBanner>, <Icon>">
          <Box w={1000} h={1300} bg="linear-gradient(160deg,#2c2a5a,#14132b)" />
          <Notif x={40} y={30} w={560} h={220} icon="school" app="Vie scolaire" time="23:58">
            <Txt x={30} y={100} w={500} size={38} weight={700}>
              Nouvelle note publiée
            </Txt>
            <Txt x={30} y={150} w={500} size={34} weight={500}>
              Mathématiques : 4/20
            </Txt>
          </Notif>
          <Phone x={640} y={30} w={320} h={520} bg="linear-gradient(#7b5cff,#ff5fa2)" />
          <Badge x={40} y={280} bg="#ff2d55">
            Nouveau
          </Badge>
          <Badge x={260} y={280} bg="#5df2a0" color="#14132b" icon="bolt">
            +1000 aura
          </Badge>
          <Gauge x={40} y={360} w={560} h={50} value={0.72} color="linear-gradient(90deg,#5cc8ff,#7b5cff)" stripes />
          <Gauge x={40} y={430} w={560} h={50} value={0.2} color="#ff4d5e" segments={5} />
          <StatBar x={40} y={500} w={560} label="Flemme" value={99} color="#ff9a3d" labelW={220} />
          <StatBar x={40} y={556} w={560} label="Ponctualité" value={12} color="#5cc8ff" labelW={220} />
          <Avatar x={40} y={630} size={110} emoji="clown-face" ring="#fff" />
          <TierRow x={40} y={770} w={920} h={130} label="S" color="#ff7a7a">
            <Emo id="pizza" x={20} y={15} size={100} shadow={false} />
          </TierRow>
          <TierRow x={40} y={900} w={920} h={130} label="D" color="#7ad0ff" />
          <NewsBanner y={1050} w={1000} h={250} ticker="CANTINE : le poisson pané reste introuvable · MÉTÉO : pluie de DM attendue">
            <T text="Le prof de maths a souri" x={30} y={0} w={940} h={100} font="display" upper align="left" />
          </NewsBanner>
          <div style={{ position: "absolute", left: 180, top: 620, width: 420, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ICONS.map((n) => (
              <Icon key={n} name={n} inline size={44} />
            ))}
          </div>
        </DevCanvas>
      </div>
    </section>
  );
}
