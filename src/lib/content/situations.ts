/**
 * Cartes "situation" : des amorces pour inspirer les joueurs.
 * Jetons remplacés à la distribution : {prof} = un prof saisi par l'hôte,
 * {eleve} = le prénom d'un joueur (ou d'un nom ajouté par l'hôte).
 *
 * Règles d'écriture (à respecter si on ajoute des cartes) :
 *  - 90 caractères max une fois résolue avec des noms de 10 lettres ;
 *  - on charrie, on n'humilie pas : les cartes à jeton parlent d'un COMPORTEMENT
 *    scolaire (retard, bavardage, oubli…), jamais de ce que la personne est ;
 *  - aucun accord en genre avec un jeton (pas de « {prof} est absent » :
 *    écrire « {prof} n'est pas là ») — le nom inséré peut être n'importe qui ;
 *  - les cartes {prof} ne dépendent pas d'une matière (le prof tiré est aléatoire) ;
 *  - « de {x} », « à {x} », « que {x} » sont permis : `resolveSituation` gère
 *    l'élision et les contractions (d'Inès, du prof de maths, au délégué…).
 */
export interface Situation {
  id: string;
  text: string;
  /**
   * Étiquettes pour équilibrer ou filtrer un tirage (voir `SITUATION_TAGS`).
   * "net" = la carte s'appuie sur un format ou un mot de la culture internet
   * des lycéens (POV, aura, storytime, « il a cuisiné »…).
   */
  tags?: string[];
}

/** Toutes les étiquettes utilisées par les cartes. */
export const SITUATION_TAGS = [
  "profs",
  "eleves",
  "net",
  "stmg",
  "matieres",
  "examens",
  "vie-scolaire",
  "lieux",
  "trajets",
  "ecrans",
  "vie",
  "parents",
  "moments",
] as const;
export type SituationTag = (typeof SITUATION_TAGS)[number];

function section(prefix: string, tags: SituationTag[], texts: string[]): Situation[] {
  return texts.map((text, i) => {
    const all = new Set<string>(tags);
    if (text.includes("{prof}")) all.add("profs");
    if (text.includes("{eleve}")) all.add("eleves");
    if (text.startsWith("POV")) all.add("net");
    return { id: `${prefix}-${i + 1}`, text, tags: [...all] };
  });
}

// ------------------------------------------------------------------ {prof}

const PROFS = section("prof", ["profs"], [
  "Quand {prof} dit « sortez une feuille »",
  "{prof} : « La sonnerie, c'est pour moi, pas pour vous »",
  "{prof} qui rend les copies de la meilleure note à la pire",
  "Quand {prof} dit « rangez vos affaires, gardez juste un stylo »",
  "Personne : rien. / {prof} : « Bon, petit contrôle surprise »",
  "{prof} face au vidéoprojecteur qui refuse de s'allumer",
  "La blague de {prof} que personne n'a comprise",
  "Quand {prof} dit « c'est pas noté » et que finalement, si",
  "{prof} : « J'ai tout mon temps, c'est sur votre récré »",
  "Quand tu vois sur l'ENT que {prof} n'est pas là demain",
  "{prof} : « Il reste cinq minutes, on attaque un nouveau chapitre »",
  "Quand {prof} dit « c'est facile » juste avant l'exercice impossible",
  "{prof} : « Ça, ça tombe au bac » pour la 40e fois de l'année",
  "{prof} qui cherche le bon câble HDMI depuis dix minutes",
  "Quand {prof} demande « des questions ? » à 2 minutes de la sonnerie",
  "{prof} : « Je ne suis pas là pour vous piéger » / Le sujet :",
  "Quand {prof} dit « on l'a vu en cours » et que personne ne s'en souvient",
  "{prof} qui efface le tableau pendant que tu recopies encore",
  "Quand {prof} passe dans les rangs et s'arrête pile derrière toi",
  "{prof} : « Je vous préviens, c'est la dernière fois » (17e édition)",
  "Le regard de {prof} quand ton téléphone sonne en plein cours",
  "{prof} : « Qui passe au tableau ? » / La classe : *fixe sa trousse*",
  "Quand {prof} dit « vous avez une heure » pour un sujet de trois heures",
  "{prof} qui annonce les notes à voix haute devant toute la classe",
  "{prof} : « Je vous rends les copies demain » (c'était il y a un mois)",
  "{prof} : « Le bac, c'est dans six mois » / Nous : « Large »",
  "Quand {prof} tape son mot de passe avec un seul doigt",
  "{prof} qui découvre que toute la classe a la même réponse fausse",
  "Quand {prof} dit « mettez-vous par deux » et que vous êtes trois",
  "{prof} : « Vous êtes ma pire classe » (dit à toutes ses classes)",
  "Quand {prof} fait l'appel et que la moitié de la classe est « en route »",
  "{prof} qui lance une vidéo et tombe sur deux pubs impossibles à passer",
  "Quand {prof} dit « on finit plus tôt aujourd'hui »",
  "{prof} : « C'est dans le cours » / Le cours : 47 photocopies en vrac",
  "Quand {prof} te pose une question pile au moment où tu décroches",
  "{prof} qui rend le devoir du premier trimestre au troisième",
  "Quand {prof} commence une phrase par « à votre âge, moi… »",
  "{prof} : « Sortez vos calculatrices » / La tienne : restée sur ton bureau",
  "Quand {prof} dit « je vais être sympa » avant de distribuer le sujet",
  "{prof} qui confisque un téléphone et le pose bien en vue sur le bureau",
  "Quand {prof} arrive avec un paquet de copies et un grand sourire",
  "La tête de {prof} en lisant ta copie de bac blanc",
  "{prof} : « Pas de devoirs pour les vacances » (un rêve que j'ai fait)",
  "Quand {prof} dit « on va faire un petit jeu » et que c'est un QCM noté",
  "{prof} qui règle le son de la vidéo : c'est soit 0, soit 100",
  "Quand {prof} annonce un exposé en groupe à rendre pour lundi",
  "{prof} : « Les délégués, vous viendrez me voir à la fin de l'heure »",
  "La tête de {prof} en voyant que personne n'a fait l'exercice",
  "{prof} qui fait « chut » plus fort que le bruit de la classe",
  "Quand {prof} écrit au feutre indélébile sur le tableau blanc",
  "{prof} : « Je compte jusqu'à trois » / La classe : *aucune réaction*",
  "Quand {prof} dit « c'est bientôt fini » depuis vingt-cinq minutes",
  "Le message de {prof} sur l'ENT un dimanche à 22 h 47",
  "Ce moment où tu croises {prof} au supermarché un samedi",
  "{prof} qui raconte sa vie au lieu de faire cours (meilleur cours)",
  "Quand {prof} dit « ouvrez vos manuels » et que trois personnes en ont un",
  "{prof} : « Qui n'a pas compris ? » / Personne ne bouge. Personne n'a compris.",
  "{prof} qui écrit « peut mieux faire » à absolument tout le monde",
  "Quand {prof} répond « bonne question » et passe à autre chose",
  "Quand {prof} prononce le mot « Parcoursup » : silence total",
  "{prof} en sortie scolaire qui recompte la classe pour la 8e fois",
  "Quand {prof} voit ton écran et que ce n'est pas vraiment le cours",
  "{prof} : « Pas de cours tant qu'il y a du bruit » / La classe : « Deal »",
  "Quand {prof} sort un nouveau plan de classe en plein mois de mars",
  "{prof} qui te sépare de ton voisin : la fin d'une époque",
  "{prof} qui nous libère cinq minutes avant la sonnerie : légende",
  "L'appréciation de {prof} sur ton bulletin : « Ensemble fragile »",
  "Quand {prof} dit que 11, c'est « une très bonne note »",
  "{prof} : « Travail en autonomie » / La classe : sieste en autonomie",
  "Quand {prof} dit « à la fin de l'heure, je ramasse »",
  "Quand {prof} lit « En tant qu'intelligence artificielle » dans ta copie",
  "Quand {prof} annonce un devoir commun le samedi matin",
  "{prof} : « Vous avez révisé ? » / Nous : *sourire gêné collectif*",
  "Quand {prof} te rend ta copie à l'envers, face cachée",
  "{prof} à 17 h 55 : « On a le temps de faire un dernier exercice »",
  "Quand {prof} dit « un volontaire, sinon je désigne »",
  "{prof} qui désigne « au hasard » : toujours la même personne",
  "Quand {prof} dit « je vous fais confiance » et quitte la salle",
  "Quand {prof} annonce la moyenne de la classe : 7,2",
  "{prof} qui écrit « illisible » sur ta copie… de façon illisible",
  "Quand {prof} retrouve enfin la télécommande du vidéoprojecteur",
  "{prof} : « Rangez les téléphones » / Les écouteurs : toujours en place",
  "Quand {prof} lance un quiz : la classe se transforme en stade",
  "{prof} qui ramasse les copies et ne les rend plus jamais",
  "Le « Bon. » de {prof} après un très long silence",
  "{prof} qui débarque en perm : « Il me faut deux volontaires »",
  "{prof} : « Le conseil de classe va être… intéressant »",
  "Quand {prof} dit « notez bien ça » et change de diapo aussitôt",
  "{prof} qui dicte si vite que ton poignet pose sa démission",
  "Quand {prof} relit ta lettre de motivation Parcoursup devant toi",
  "{prof} avant le Grand oral blanc : « Détendez-vous » / Nous :",
  "Quand {prof} annonce que le bac blanc compte coefficient 3",
  "Le silence quand {prof} demande « qui a fait ses devoirs ? »",
  "Ce moment où tu appelles {prof} « maman » devant toute la classe",
  "Quand {prof} dit « je ne répéterai pas » et répète quatre fois",
  "{prof} : « Ce n'est pas moi qui passe le bac » (vu sous cet angle…)",
  "Quand {prof} commence par « bon, j'ai corrigé vos copies… »",
  "POV : {prof} essaie de partager son écran depuis un quart d'heure",
  "{prof} qui annonce « interro la semaine prochaine » sans dire quel jour",
  "Quand {prof} dit « c'est une classe sympa, mais… »",
  "La classe quand {prof} n'est toujours pas là au bout de quinze minutes",
  "La réunion parents-profs avec {prof} : cinq minutes très, très longues",
  "Le remplaçant de {prof} : « Vous en êtes où ? » / La classe : « Au début »",
  "POV : {prof} t'envoie chercher des feutres à l'autre bout du lycée",
  "Quand tes parents ont rendez-vous avec {prof}",
  "Quand {prof} dit « on regarde un film » juste avant les vacances",
]);

// ------------------------------------------------------------------ {eleve}

const ELEVES = section("eleve", ["eleves"], [
  "{eleve} qui arrive avec vingt minutes de retard et un pain au chocolat",
  "{eleve} qui lève la main : « On n'avait pas un devoir à rendre ? »",
  "La tête de {eleve} quand la sonnerie retentit en plein contrôle",
  "{eleve} qui demande « c'est noté ? » avant même d'avoir le sujet",
  "POV : {eleve} dort près du radiateur depuis le début de l'heure",
  "{eleve} qui a « oublié » sa trousse pour la trentième fois",
  "{eleve} : « J'ai rien révisé » / Sa note : 18",
  "La tête de {eleve} en découvrant le sujet de philo",
  "{eleve} sur le groupe de classe à 23 h 58 : « Y a quoi pour demain ? »",
  "{eleve} qui demande une feuille. Puis un stylo. Puis la réponse.",
  "Quand {eleve} dit « t'inquiète, je gère » pour l'exposé",
  "{eleve} et {eleve} qui bavardent même à six tables d'écart",
  "{eleve} qui répond à une question que personne n'a posée",
  "Quand {eleve} rappelle à {prof} qu'il y avait un devoir à rendre",
  "{eleve} qui mange en cours « discrètement » (on entend le paquet du couloir)",
  "La tête de {eleve} quand on lui rend sa copie",
  "{eleve} qui négocie un demi-point pendant vingt minutes",
  "POV : {eleve} justifie son retard à la vie scolaire",
  "{eleve} qui réserve la place près du radiateur dès septembre",
  "Quand {eleve} dit « je passe à la fin » le jour des oraux",
  "{eleve} qui fait tomber sa gourde en métal en plein contrôle",
  "{eleve} à 7 h 59 : encore dans le bus",
  "{eleve} qui cherche une prise avant de chercher sa place",
  "Quand {eleve} crée un groupe pour l'exposé et n'y écrit plus jamais",
  "{eleve} dans le travail de groupe : a choisi la couleur du diapo",
  "La tête de {eleve} quand {prof} dit « au tableau »",
  "{eleve} qui finit le contrôle en quinze minutes : génie ou coup de bluff ?",
  "{eleve} qui dit « j'ai tout raté » et qui a 16",
  "{eleve} qui part aux toilettes et revient vingt-cinq minutes plus tard",
  "{eleve} qui prend le tableau en photo « pour recopier ce soir »",
  "POV : {eleve} révise dans le couloir deux minutes avant le contrôle",
  "{eleve} qui envoie quatorze vocaux d'une minute sur le groupe de classe",
  "{eleve} qui demande « on peut sortir ? » à moins dix",
  "Quand {eleve} éclate de rire devant son téléphone en plein cours",
  "{eleve} qui a toujours des chewing-gums (et donc beaucoup d'amis)",
  "Le sac de {eleve} : un seul cahier pour toutes les matières",
  "{eleve} qui rend sa copie en premier et regarde les autres souffrir",
  "Quand {eleve} répond « ici ! » à la place de quelqu'un d'autre",
  "{eleve} qui lance les applaudissements quand un plateau tombe au self",
  "{eleve} au self : « Tu finis pas tes frites ? »",
  "{eleve} qui connaît le menu de la cantine par cœur",
  "{eleve} qui tient depuis 8 h avec 1 % de batterie",
  "{eleve} le jour de l'exposé : « J'ai pas reçu le diapo »",
  "Quand {eleve} lit son exposé mot à mot sur son téléphone",
  "{eleve} qui annonce « dernière question » et en pose quatre",
  "POV : {eleve} apprend qu'il y a contrôle en entrant dans la salle",
  "{eleve} qui a le permis avant le bac : taxi officiel de la classe",
  "Quand {eleve} dit « j'arrive » sans avoir quitté son lit",
  "{eleve} qui retient la porte du bus pour tout le monde : légende du matin",
  "La tête de {eleve} le lundi à 8 h",
  "{eleve} le vendredi à 17 h : une tout autre personne",
  "Quand {eleve} demande « ça compte dans la moyenne ? »",
  "{eleve} qui raconte le conseil de classe comme une série à suspense",
  "{eleve} qui emprunte un stylo en septembre et le rend… jamais",
  "Quand {eleve} dit « chut, {prof} arrive » et que c'est faux",
  "{eleve} qui fait le guet à la porte pendant que la classe s'agite",
  "{eleve} qui commence ses révisions du bac la veille au soir",
  "{eleve} qui demande « on a quoi après ? » à chaque heure",
  "{eleve} qui s'installe au dernier rang « pour mieux voir le tableau »",
  "{eleve} en EPS : « J'ai oublié mes affaires » (saison 3, épisode 12)",
  "{eleve} qui court après le bus avec le sac grand ouvert",
  "La tête de {eleve} quand Parcoursup affiche « en attente »",
  "{eleve} qui actualise Parcoursup toutes les quatre minutes",
  "Quand {eleve} annonce fièrement : « J'ai eu la moyenne ! »",
  "{eleve} qui parle plus fort que {prof} sans s'en rendre compte",
  "{eleve} qui dit « à demain » un vendredi soir",
  "{eleve} qui répond « oui » à une question ouverte",
  "Quand {eleve} demande à {prof} de répéter toute la consigne",
  "{eleve} qui se balance sur sa chaise : chute prévue à 10 h 42",
  "{eleve} qui se souvient du DM en voyant les autres le rendre",
  "Quand {eleve} propose « on révise ensemble ? » : zéro révision en vue",
  "{eleve} parle, {eleve} passe les diapos : un exposé bien réparti",
  "{eleve} qui souligne le titre en trois couleurs et s'arrête là",
  "{eleve} qui débarque en cours avec un café, comme en réunion",
  "{eleve} : « Vous pouvez répéter la question ? » (pour gagner du temps)",
  "POV : {eleve} fait semblant de chercher son carnet dans son sac",
  "{eleve} qui te souffle la réponse. La mauvaise.",
  "{eleve} qui envoie au groupe de classe un message prévu pour le groupe privé",
  "Les écouteurs : un pour {eleve}, un pour {eleve}, zéro pour le cours",
  "{eleve} pour l'exposé : « Toi l'intro, moi la conclusion »",
  "{eleve} qui entre dans la mauvaise salle et s'assoit quand même",
  "Le stylo quatre couleurs de {eleve} : clic, clic, clic, clic",
]);

// ------------------------------------------------------------------ STMG

const STMG = section("stmg", ["stmg"], [
  "Définir « la finalité d'une organisation » de tête, un lundi à 8 h",
  "L'étude de gestion : commencée en novembre, terminée la veille",
  "« Analysez le document 3 » / Le document 3 : un tableau de 40 lignes",
  "Le cours de droit en une phrase : « Ça dépend. »",
  "Quand tu écris « selon l'annexe 2 » sans avoir ouvert l'annexe 2",
  "En économie : répondre « l'offre et la demande » à toutes les questions",
  "Mercatique : tu connais les 4P, mais plus ce que veut dire chaque P",
  "Gestion-finance : ton bilan ne s'équilibre pas, à trois centimes près",
  "Le cas pratique de droit : « M. Martin achète un scooter d'occasion… »",
  "RH : rédiger une fiche de poste alors que personne ne répond à ton CV",
  "Au repas de famille : « Et c'est quoi, STMG, exactement ? »",
  "Faire le SWOT de ta semaine : beaucoup de menaces, peu d'opportunités",
  "Calculer un seuil de rentabilité à 8 h du matin",
  "Quand ton tableur affiche #REF! dans toutes les cellules",
  "L'exemple du cours de management : toujours la même boulangerie",
  "Confondre chiffre d'affaires et bénéfice devant le jury",
  "Le syllogisme juridique : majeure, mineure, panique",
  "Débit à gauche, crédit à droite, et toi au milieu, sans repères",
  "« Parties prenantes » : le mot que tu places dans toutes tes copies",
  "« Justifiez votre réponse » / Ta réponse : « Parce que. »",
]);

// ------------------------------------------------------------------ autres matières

const MATIERES = section("matiere", ["matieres"], [
  "Sujet de philo : « Peut-on être libre ? » / Toi, en colle samedi :",
  "Philo : quatre heures, une copie double, zéro idée",
  "Citer en philo un philosophe que tu viens d'inventer",
  "Ta copie de philo : deux pages d'intro et pas de conclusion",
  "« Thèse, antithèse, synthèse » / Ton plan : thèse, antithèse, sieste",
  "La calculatrice qui affiche « ERREUR SYNTAXE » en plein contrôle",
  "Maths : tu trouves x = 3, la correction annonce x = −47,5",
  "« Démontrez que… » / Toi : « Ça se voit. »",
  "Plus de piles dans la calculatrice le matin du bac blanc",
  "Anglais : « Can I go to the toilet? », la seule phrase maîtrisée",
  "Compréhension orale : tu as reconnu « hello » et « thank you »",
  "L'oral d'espagnol : « Me llamo… » et puis le vide",
  "« In English, please! » : et soudain, plus personne ne parle",
  "EPS à 8 h en janvier : course d'endurance sous la pluie",
  "Le test du bip : palier 2, déjà en train de négocier",
  "Badminton en EPS : le volant coincé dans le plafond du gymnase",
  "Acrosport : « Faites-vous confiance. » Personne ne fait confiance.",
  "Histoire-géo : le croquis où tu colories plus que tu ne réfléchis",
  "Apprendre douze dates la veille et n'en retenir qu'une (la mauvaise)",
]);

// ------------------------------------------------------------------ bac, Grand oral, Parcoursup

const EXAMENS = section("exam", ["examens"], [
  "Bac blanc : sortie autorisée au bout d'une heure, salle vide à 1 h 01",
  "Grand oral : dix minutes à tenir, deux minutes de contenu",
  "Parcoursup : « En attente — position 847 sur 900 »",
  "Lettre de motivation : « Passionné depuis toujours par la gestion… »",
  "Écrire son « projet de formation motivé » sans projet ni motivation",
  "Valider ses vœux Parcoursup à 23 h 52 le dernier jour",
  "Jour des résultats Parcoursup : le site plante à 19 h 01",
  "Quand même ton vœu « de secours » te met en liste d'attente",
  "Grand oral : le jury choisit LA question que tu n'as pas préparée",
  "« Quel lien avec votre projet d'orientation ? » / Toi : « Euh… »",
  "Les fiches de révision : magnifiques, jamais relues",
  "Réviser le bac avec des vidéos en vitesse ×2 la veille",
  "Surligner tout le cours : désormais, tout est important",
  "« Ce soir, je me couche tôt » / Toi à 2 h : « Encore une vidéo »",
  "Nuit blanche de révisions, puis s'endormir pendant l'épreuve",
  "Ce moment où tu réalises que le sujet est recto verso",
  "Ce moment où tu rends ta copie et retrouves la bonne réponse",
  "Ce moment où ton stylo lâche en pleine dissertation",
  "Ce moment où tu comprends enfin le cours… pendant le contrôle",
  "Le planning de révisions : parfait sur le papier, abandonné le mardi",
  "« Tu veux faire quoi plus tard ? » : la question qui fait transpirer",
]);

// ------------------------------------------------------------------ vie scolaire

const VIE_SCOLAIRE = section("viesco", ["vie-scolaire"], [
  "Bulletin : « Des capacités, mais… »",
  "« Bavardages » : le mot le plus écrit sur ton bulletin",
  "Les délégués après le conseil : « Ils ont parlé de toi quatre secondes »",
  "Élection des délégués : des promesses dignes d'une présidentielle",
  "Quand le CPE t'appelle par ton nom ET ton prénom",
  "Le surveillant qui réclame ton carnet alors que tu es en terminale",
  "Passer à la vie scolaire « juste pour un billet » : vingt-cinq minutes",
  "Deux minutes de retard : billet obligatoire, regard de toute la classe",
  "Une heure de colle un mercredi après-midi",
  "« Donne-moi ton carnet » / Toi, sans carnet depuis octobre :",
  "L'ENT affiche une nouvelle note : tu hésites à cliquer",
  "La notification « nouvelle note » qui tombe à table, devant les parents",
  "« Absence injustifiée » alors que tu étais là, juste au fond",
  "L'emploi du temps : un trou de 10 h à 15 h le mardi",
]);

// ------------------------------------------------------------------ lieux du lycée

const LIEUX = section("lieu", ["lieux"], [
  "Le self : vingt-cinq minutes de queue pour sept minutes de repas",
  "Jour de frites à la cantine : tout le lycée est soudain à l'heure",
  "La carte de self qui ne passe pas, et toute la file qui te regarde",
  "Le plat mystère de la cantine : personne ne sait, tout le monde goûte",
  "Plus de pain au self dès 12 h 10",
  "Le distributeur qui avale ta pièce et garde le paquet",
  "Le bruit le plus fort du CDI : le « chut ! »",
  "Aller au CDI « pour travailler » : la sieste la mieux chauffée du lycée",
  "Ton casier : ouvert une fois en septembre, plus jamais depuis",
  "Les couloirs à l'intercours : le périphérique à l'heure de pointe",
  "Les escaliers quand tout le lycée change de salle en même temps",
  "Les toilettes du lycée : ni savon, ni papier, mais toujours du monde",
  "Salle 312 : troisième étage, sans ascenseur, à l'autre bout du lycée",
  "Le radiateur de la salle : soit le désert, soit la banquise",
  "La fenêtre : « on ouvre », « on ferme », le débat éternel",
  "L'alarme incendie en plein contrôle : la meilleure nouvelle du trimestre",
  "Le wifi du lycée : il existe, mais seulement en théorie",
  "La salle info : un ordi sur deux fonctionne, devine lequel tu as",
]);

// ------------------------------------------------------------------ transports, matin

const TRANSPORTS = section("trajet", ["trajets"], [
  "Le bus de 7 h 12 : si tu le rates, le suivant est à 7 h 58",
  "Courir après le bus pendant que le chauffeur te regarde dans le rétro",
  "Le bus du matin : quatre-vingts personnes, quarante places",
  "Ton sac à dos : neuf kilos, dont huit que tu n'ouvriras pas",
  "Le réveil à 6 h 15 en plein mois de décembre",
  "Arriver en avance le seul jour où le cours est annulé",
  "« Encore cinq minutes » : cinq fois de suite, puis panique",
]);

// ------------------------------------------------------------------ groupe de classe, exposés, téléphone

const ECRANS = section("ecran", ["ecrans"], [
  "Le groupe de classe : 300 messages non lus, zéro info utile",
  "« Quelqu'un a le cours ? » envoyé à 23 h 40, la veille du contrôle",
  "« Qqn a fait l'exo 4 ? » / Vu par 31 personnes, aucune réponse",
  "Travail de groupe : quatre noms sur la copie, une personne au travail",
  "Le diapo terminé à 2 h du matin, présenté à 8 h",
  "Le fichier de l'exposé : resté sur l'ordinateur de la maison",
  "« Je laisse la parole à mon camarade » / Le camarade : pas prêt du tout",
  "Téléphone confisqué jusqu'à vendredi : jour 1 sans écran",
  "1 % de batterie et encore trois heures de cours",
  "Un seul chargeur pour toute la classe : la liste d'attente",
  "Ton téléphone qui vibre sur la table en plein silence",
  "L'ENT qui plante le soir où il faut rendre le devoir",
  "Rendre le devoir à 23 h 59 pour une limite à 23 h 59",
  "L'IA a écrit ton devoir : maintenant, il faut l'expliquer à l'oral",
]);

// ------------------------------------------------------------------ permis, job, soirées, semaine, vacances

const VIE = section("vie", ["vie"], [
  "Le code : douze fautes à l'entraînement, examen demain",
  "Première heure de conduite : caler sur le parking, trois fois",
  "Job d'été : quatorze CV envoyés, zéro réponse",
  "Lendemain de soirée, cours à 8 h",
  "Lundi 8 h : deux heures de gestion pour bien commencer la semaine",
  "Vendredi 17 h : la sonnerie la plus attendue de la semaine",
  "Dimanche, 21 h : tu te souviens du devoir pour lundi",
  "Les vacances : « Je vais m'avancer dans mon travail » (non)",
  "La rentrée : trousse neuve et bonnes résolutions, valables quatre jours",
  "Veille de rentrée : impossible de dormir avant 3 h",
  "Le moniteur d'auto-école : « Regarde tes rétros. » Toi : « Lesquels ? »",
  "Mercredi après-midi : tu avais prévu de réviser. Tu avais prévu.",
]);

// ------------------------------------------------------------------ parents et notes

const PARENTS = section("parents", ["parents"], [
  "Tes parents à chaque note : « Et les autres, ils ont eu combien ? »",
  "Annoncer un 6 : « Mais la moyenne de la classe, c'était 7 ! »",
  "Quand tes parents découvrent qu'ils peuvent voir tes notes en ligne",
  "« On en reparlera à la maison. »",
  "Annoncer d'abord le 15 en EPS, puis glisser le 4 en maths",
  "« Tu as des devoirs ? » / Toi : « Non. » / L'ENT : « Si. »",
  "« Tu révises ? » / Toi, téléphone caché sous le classeur : « Oui oui »",
]);

// ------------------------------------------------------------------ moments de classe

const MOMENTS = section("moment", ["moments"], [
  "Ce moment où toute la classe se retourne vers toi",
  "Ce moment où tu lèves la main et oublies ta question",
  "Ce moment où ton ventre gargouille en plein silence",
  "Ce moment où tu ris encore alors que toute la classe s'est tue",
  "POV : tu fais semblant de noter alors que ton stylo ne marche plus",
  "POV : tu as dit « j'ai compris » et on te demande d'expliquer",
  "La classe quand quelqu'un demande s'il y a des devoirs",
  "Personne : rien. / Le vidéoprojecteur : « Aucun signal »",
  "À la sonnerie : trente trousses qui se ferment en même temps",
]);

// ------------------------------------------------------------------ culture internet × {prof}
// Formats et mots que les lycéens utilisent vraiment (2025-2026). Les mots datés
// (« swag », « quoicoubeh », le dab) ne servent qu'au gag du prof en retard d'une mode.
// Aucun nom de personne réelle, aucune marque.

const NET_PROFS = section("netprof", ["net", "profs"], [
  "POV : {prof} lâche un « c'est une masterclass » pour faire jeune",
  "Quand {prof} tente un « quoicoubeh » en 2026 : gênance générale",
  "{prof} : « Quoi ? » / Toute la classe : « Feur. »",
  "Askip {prof} n'est pas là demain (source : tkt)",
  "{prof} qui rend les copies en une semaine : green flag absolu",
  "Red flag : {prof} qui dit « c'est juste une petite évaluation »",
  "+1000 aura pour {prof} : contrôle reporté à la semaine prochaine",
  "{prof} a cuisiné : sujet de quatre pages, zéro question de cours",
  "Le sujet de {prof}, première question : c'est cuit",
  "Storytime : le jour où {prof} a lu mon petit mot à voix haute",
  "Le lore de {prof} : chaque année, une nouvelle anecdote de jeunesse",
  "{prof} qui découvre le mot « aura » et le place à chaque phrase",
  "Quand {prof} annonce « exercices 6 et 7 » sans se douter de rien",
  "Tier list des excuses pour un devoir non rendu, notée par {prof}",
  "Le cours de {prof} le vendredi à 16 h : le boss final de la semaine",
  "{prof} : « Rangez vos téléphones » / Ton temps d'écran : 9 h 42",
  "Quand {prof} tente un « wesh la classe » pour détendre l'ambiance",
  "{prof} en mode nonchalant : rend les copies sans un seul commentaire",
  "{prof} locked in : trois chapitres bouclés en une heure",
  "Speedrun du programme par {prof} : six chapitres au mois de mai",
  "{prof} en plein cours : « On ne tourne pas de trend dans ma salle »",
  "La blague de {prof} : énorme flop, mais respect pour la tentative",
  "Quand la vanne de {prof} passe : un banger, toute la classe valide",
  "{prof} qui dit encore « swag » : 2012 n'est jamais vraiment parti",
  "Quand {prof} fait un dab pour fêter la moyenne de la classe",
  "Expliquer « PNJ » à {prof} : la quête secondaire du jour",
  "{prof} qui laisse la classe choisir la date du contrôle : dinguerie",
  "Le diapo de {prof} : 84 diapositives. Partie 2 demain.",
  "Quand {prof} improvise un schéma au tableau : laissez cuisiner",
  "{prof} qui te laisse en vu sur l'ENT depuis trois semaines",
  "L'appréciation de {prof} : « Des efforts ce trimestre » — énorme W",
  "Jumpscare : {prof} juste derrière toi pendant que tu scrolles",
  "Tu corriges {prof}, et c'est toi qui as tort : ratio en direct",
  "Quand {prof} lit ta copie en exemple : personnage principal du jour",
  "Le remplaçant de {prof} qui met un film : aura infinie",
  "{prof} : « J'ai vu ça sur les réseaux » / La classe retient son souffle",
  "{prof} : « Je vous avais prévenus. » Traduction : cheh.",
  "Brainrot : répondre « feur » à {prof} sans le faire exprès",
  "Delulu : croire que {prof} a oublié le contrôle",
  "L'edit de {prof} qui efface le tableau, avec une musique triste",
  "Téléphone confisqué par {prof} : adieu les flammes",
]);

// ------------------------------------------------------------------ culture internet × {eleve}

const NET_ELEVES = section("neteleve", ["net", "eleves"], [
  "{eleve} qui raconte son week-end en storytime (partie 4)",
  "+1000 aura : {eleve} répond juste à la question piège",
  "Perte d'aura : {eleve} qui dit « bon appétit » à {prof} à 8 h du matin",
  "{eleve} a cuisiné : exposé sans notes, 18 sur 20",
  "Laissez cuisiner {eleve} : l'exposé commence dans quatre minutes",
  "{eleve} en mode locked in : révise même pendant la récré",
  "{eleve} en mode nonchalant : rend sa copie au bout de vingt minutes",
  "Le lore de {eleve} : cette place près de la fenêtre, depuis la seconde",
  "Quête secondaire de {eleve} : chercher des feutres, revenir dans une heure",
  "Personnage principal : {eleve} qui arrive en retard, tout le monde regarde",
  "Le snap de 7 h 58 de {eleve} : « J'arrive » (photo prise depuis son lit)",
  "{eleve} qui poste une story du cours… pendant le cours",
  "Le vocal de quatre minutes de {eleve} : résumé en un mot, « oui »",
  "Tu oublies ton parapluie, il pleut : le « cheh » de {eleve}",
  "Tier list des meilleures places de la salle, par {eleve}",
  "Speedrun : {eleve} finit le DM dans le bus, record battu",
  "{eleve} qui commente le cours en direct, comme un live",
  "GRWM : {eleve} se prépare pour un contrôle pas du tout révisé",
  "{eleve} qui dit « c'est une dinguerie » pour un 11 sur 20",
  "Delulu : {eleve} qui prévoit de réviser tout le programme dimanche",
  "Le téléphone de {eleve} qui sonne en plein contrôle : la gênance",
  "{eleve} qui prépare déjà l'edit de fin d'année de la classe",
  "L'aura de {eleve} : arriver sans sac, repartir avec la moyenne",
  "{eleve} qui dit « partie 2 ? » quand {prof} finit son anecdote",
  "{eleve} qui répond « 6-7 » en maths. C'était la bonne réponse.",
  "Green flag : {eleve} qui partage ses fiches à toute la classe",
  "Red flag : {eleve} qui dit « je te rends ton stylo demain »",
  "{eleve} qui carry le travail de groupe à quatre : respect",
  "Énorme W pour {eleve} : contrôle annulé, rien révisé",
  "{eleve} qui scrolle sous la table : pouce d'athlète, regard innocent",
  "Le « askip » de {eleve} : 100 % des rumeurs du lycée, 0 % de sources",
  "{eleve} qui commence chaque phrase par « en vrai… », en vrai",
  "{eleve} en mode avion tout le cours : aucune notification reçue",
]);

// ------------------------------------------------------------------ culture internet × lycée

const NET = section("net", ["net"], [
  "POV : tu es le PNJ du fond de la classe, on ne t'interroge jamais",
  "Storytime : comment j'ai révisé tout le programme en une nuit",
  "GRWM : il est 7 h 52, départ à 7 h 53",
  "Speedrun de l'exposé commencé à 7 h 40",
  "Perte d'aura : tirer une porte marquée « poussez » devant tout le lycée",
  "+1000 aura : trouver la réponse que même le prof cherchait",
  "Perte d'aura : ta chaise qui bascule en plein silence",
  "Brainrot : scroller trois heures et appeler ça « une pause »",
  "Brainrot : zéro formule en tête, mais tous les sons du moment",
  "La moyenne de la classe : 6,7. Bizarrement, personne n'est triste.",
  "Locked in : la veille du bac, de 23 h à 23 h 20",
  "Delulu : « Je vais m'y mettre dès la rentrée »",
  "Red flag : « On se répartit le travail plus tard »",
  "Green flag : le prof qui annonce la date du contrôle un mois avant",
  "Tier list du self : les frites en S, le reste se bat pour la dernière place",
  "Tier list des salles : celle avec des prises, puis toutes les autres",
  "Le lore de la classe : cette sortie scolaire dont on parle encore",
  "Quête secondaire : trouver une prise libre dans tout le lycée",
  "Quête principale : le bac. Quête secondaire : un stylo qui marche.",
  "Personnage principal jusqu'à 8 h 02, puis « sortez une feuille »",
  "Le boss final de l'année : le Grand oral",
  "Ta moyenne : glow up au deuxième trimestre, rechute au troisième",
  "Ton exposé : pour toi un banger, pour le jury un flop",
  "Bac blanc : rien révisé, c'est cuit, mais tu y vas en mode nonchalant",
  "Cheh : tu as séché le seul cours où le prof donnait les réponses",
  "Ta page « Pour toi » la veille du bac : que des vidéos de révisions",
  "« Juste une vidéo avant de réviser » : il est 1 h 47",
  "Ton temps d'écran pendant la semaine du bac blanc : 9 h 42 par jour",
  "Le vocal de quatre minutes qui aurait pu être un « ok »",
  "Les stories de vacances des autres pendant que tu révises",
  "Garder ses flammes en plein cours : la mission quotidienne",
  "Le snap de 7 h 58 : un bout de trottoir flou et « j'arrive »",
  "Te faire ratio par les délégués sur le groupe de classe",
  "Tourner une trend dans le couloir et tomber sur le CPE",
  "Ce que je mange en une journée au lycée : du pain. Fin de la vidéo.",
  "Une journée dans ma vie de terminale : bus, cours, self, cours, bus",
  "Unboxing du sac : zéro cahier, trois chargeurs, un sandwich d'hier",
  "ASMR : le paquet de gâteaux ouvert en plein contrôle",
  "Tuto : avoir l'air de suivre le cours en dormant les yeux ouverts",
  "Les types d'élèves pendant un contrôle : celui qui souffle très fort",
  "Normalisons : arriver en retard le lundi à 8 h",
  "Abonne-toi pour la partie 2 de mon exposé (il n'y a pas de partie 2)",
  "Skill issue : rater la poubelle à un mètre, devant toute la classe",
  "Mode sigma : traverser la cour, écouteurs vissés, regard au loin",
  "En mode avion… dans ta tête, depuis le début du cours",
  "Masterclass : rendre un DM fait dans le bus et avoir 15",
  "Une dinguerie : le prof absent ET des frites au self le même jour",
  "Ton cerveau qui lag quand on t'interroge à 8 h 05",
  "GG : toute la classe a la moyenne, le prof n'en revient pas",
  "« C'est mid » : ton avis sur le self, chaque midi depuis la seconde",
  "Tenter le rizz sur le jury du Grand oral : aucun effet",
  "POV : tu dis « tkt, je gère » et tu ne gères rien du tout",
  "POV : le prof dit « mettez-vous en groupe » et tu cherches un regard",
  "POV : tu ouvres le sujet et tu ne reconnais même pas la matière",
  "Dans le film de ma vie, la scène du bac blanc est coupée au montage",
  "Aura farming : poser son stylo et fixer la fenêtre, l'air de tout savoir",
  "Ton écran projeté au tableau, avec tous tes onglets : la gênance",
  "W : cours annulé. L : c'était le seul que tu avais révisé.",
]);

export const SITUATIONS: Situation[] = [
  ...PROFS,
  ...ELEVES,
  ...NET_PROFS,
  ...NET_ELEVES,
  ...NET,
  ...STMG,
  ...MATIERES,
  ...EXAMENS,
  ...VIE_SCOLAIRE,
  ...LIEUX,
  ...TRANSPORTS,
  ...ECRANS,
  ...VIE,
  ...PARENTS,
  ...MOMENTS,
];

// ------------------------------------------------------------------ résolution

export interface SituationContext {
  profs: string[];
  eleves: string[];
}

/** Replis quand l'hôte n'a saisi aucun prof. */
export const FALLBACK_PROFS: readonly string[] = [
  "le prof de maths",
  "la prof d'anglais",
  "le prof de management",
  "la prof de philo",
  "le prof d'EPS",
  "la prof de droit",
  "le prof d'histoire-géo",
  "la prof d'éco",
  "le prof de gestion",
  "la prof d'espagnol",
  "le prof principal",
  "la prof de mercatique",
];

/** Replis quand il n'y a aucun prénom disponible. */
export const FALLBACK_ELEVES: readonly string[] = [
  "ton voisin",
  "ta voisine",
  "le délégué",
  "la déléguée",
  "quelqu'un du fond",
  "ton pote",
  "ta pote",
  "le voisin de derrière",
  "la voisine de devant",
  "quelqu'un du premier rang",
];

const LETTER = "A-Za-zÀ-ÖØ-öø-ÿŒœ";
const PLAIN_VOWELS = "aeiouàâäéèêëîïôöùûüœæ";
/** Prénoms à « h muet » (on écrit « d'Hugo » mais « de Hamza »). */
const MUTE_H = ["hug", "henr", "hél", "hel", "herv", "hort", "hipp", "hono", "hub", "hect", "herm", "hora", "hila", "hadr"];
/** Dernier mot avant le jeton, s'il peut se contracter ou s'élider. */
const LINK_WORD = new RegExp(`(^|[^${LETTER}'’])(de|à|que|lorsque|puisque|quoique) $`, "i");

function startsWithVowelSound(name: string): boolean {
  const s = name.toLowerCase();
  const c = s.charAt(0);
  if (!c) return false;
  if (PLAIN_VOWELS.includes(c)) {
    // « ou » + voyelle se prononce [w] : « de Ouassim », pas « d'Ouassim »
    return !(s.startsWith("ou") && PLAIN_VOWELS.includes(s.charAt(2)) && s.length > 2);
  }
  // « d'Yves », « d'Yvan » mais « de Yanis », « de Youssef »
  if (c === "y") return s.length > 1 && !PLAIN_VOWELS.includes(s.charAt(1));
  if (c === "h") return MUTE_H.some((p) => s.startsWith(p));
  return false;
}

function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1);
}

/** Le jeton ouvre-t-il une phrase ? (début, après . ! ?, après « / » ou « « ») */
function atSentenceStart(before: string): boolean {
  const t = before.trimEnd();
  return t === "" || /[.!?/«]$/.test(t);
}

/**
 * Colle `name` à la suite de `before` en respectant le français :
 * « de le prof » → « du prof », « à le délégué » → « au délégué »,
 * « de Inès » → « d'Inès », « que Inès » → « qu'Inès », majuscule en début de phrase.
 */
function attach(before: string, rawName: string): string {
  const name = rawName.trim().replace(/\s+/g, " ");
  const link = LINK_WORD.exec(before);
  if (link) {
    const word = link[2];
    const head = before.slice(0, before.length - word.length - 1);
    const lower = word.toLowerCase();
    const upper = word.charAt(0) !== lower.charAt(0);
    const keepCase = (s: string) => (upper ? capitalize(s) : s);
    const article = /^(le|les) /i.exec(name);
    if (article && (lower === "de" || lower === "à")) {
      const plural = article[1].toLowerCase() === "les";
      const fused = lower === "de" ? (plural ? "des" : "du") : plural ? "aux" : "au";
      return `${head}${keepCase(fused)} ${name.slice(article[0].length)}`;
    }
    if (lower !== "à" && startsWithVowelSound(name)) {
      return `${head}${word.slice(0, -1)}'${name}`;
    }
    return `${before}${name}`;
  }
  return before + (atSentenceStart(before) ? capitalize(name) : name);
}

function pickName(
  list: readonly string[],
  fallback: readonly string[],
  used: string[],
  rand: () => number,
): string {
  const source = list.some((n) => n.trim() !== "") ? list.filter((n) => n.trim() !== "") : fallback;
  const fresh = source.filter((n) => !used.includes(n));
  const pool = fresh.length > 0 ? fresh : source;
  const r = rand();
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * pool.length)));
  const name = pool[i];
  used.push(name);
  return name;
}

/**
 * Remplace {prof} / {eleve}. `rand` renvoie un nombre dans [0, 1).
 * Deux jetons identiques dans une carte reçoivent deux noms différents si possible.
 * Listes vides : replis naturels (« le prof de maths », « ton voisin »…).
 */
export function resolveSituation(text: string, ctx: SituationContext, rand: () => number): string {
  const used: Record<"prof" | "eleve", string[]> = { prof: [], eleve: [] };
  const token = /\{(prof|eleve)\}/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = token.exec(text)) !== null) {
    const kind = m[1] as "prof" | "eleve";
    const name =
      kind === "prof"
        ? pickName(ctx.profs, FALLBACK_PROFS, used.prof, rand)
        : pickName(ctx.eleves, FALLBACK_ELEVES, used.eleve, rand);
    out = attach(out + text.slice(last, m.index), name);
    last = m.index + m[0].length;
  }
  return out + text.slice(last);
}

/** Une carte tirée : `text` est déjà résolu (plus aucun jeton). */
export interface DrawnSituation {
  id: string;
  text: string;
}

/**
 * Tire `count` cartes différentes et les résout.
 * `exclude` : ids déjà distribués (ignoré s'il ne reste plus assez de cartes).
 */
export function drawSituations(
  count: number,
  ctx: SituationContext,
  rand: () => number,
  exclude?: Iterable<string>,
): DrawnSituation[] {
  const n = Math.max(0, Math.min(Math.floor(count), SITUATIONS.length));
  const excluded = new Set(exclude ?? []);
  const preferred = SITUATIONS.filter((s) => !excluded.has(s.id));
  const rest = SITUATIONS.filter((s) => excluded.has(s.id));
  const drawn: Situation[] = [];
  for (const pool of [preferred, rest]) {
    while (drawn.length < n && pool.length > 0) {
      const r = rand();
      const i = Math.min(pool.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * pool.length)));
      drawn.push(pool.splice(i, 1)[0]);
    }
  }
  return drawn.map((s) => ({ id: s.id, text: resolveSituation(s.text, ctx, rand) }));
}

/** Les cartes portant une étiquette donnée (ex. "net", "profs", "stmg"). */
export function situationsWithTag(tag: SituationTag): Situation[] {
  return SITUATIONS.filter((s) => s.tags?.includes(tag));
}
