import type { Base } from './types';
import { isAggregate } from './data';

type L = { de: string; en: string };
export interface Question {
  id: string;
  q: L;
  options: L[];
  answer: number;
  explain: L;
  /** base to link and to take an image from */
  base?: string;
}

const L = (de: string, en: string): L => ({ de, en });

/** questions; numbers are taken from the dataset where possible */
export function buildQuiz(bases: Base[]): Question[] {
  const sites = bases.filter((b) => !isAggregate(b));
  const de = sites.filter((b) => b.host.country === 'DE' && b.scope !== 'domestic').length;
  // sites, not the separate depot entry at Kleine Brogel (part of the air base)
  const nuclear = sites.filter((b) => b.features.includes('nuclear-sharing') && !b.relations?.some((r) => r.type === 'part-of')).length;
  const okinawa = sites.filter((b) => b.subregion === 'Okinawa').length;
  const round = (n: number) => Math.max(5, Math.round(n / 5) * 5);

  return [
    {
      id: 'us-total',
      q: L('Wie viele Militärbasen unterhalten die USA ungefähr im Ausland?', 'Roughly how many military bases does the US maintain abroad?'),
      options: [L('rund 80', 'about 80'), L('rund 250', 'about 250'), L('rund 800', 'about 800'), L('rund 3.000', 'about 3,000')],
      answer: 2,
      explain: L(
        'David Vine schätzt rund 800 – etwa 95 % aller ausländischen Militärbasen weltweit. Nur rund die Hälfte davon steht im offiziellen Pentagon-Bericht.',
        'David Vine estimates around 800 – about 95 % of all foreign military bases worldwide. Only about half of them appear in the official Pentagon report.',
      ),
    },
    {
      id: 'germany',
      q: L('Wie viele US- und NATO-Standorte sind in VisualBases allein für Deutschland erfasst?', 'How many US and NATO sites does VisualBases list for Germany alone?'),
      options: [round(de / 4), round(de / 2), de, round(de * 2)].map((n) => L(String(n), String(n))),
      answer: 2,
      explain: L(`${de} Standorte – Deutschland ist das Land mit den meisten erfassten fremden Militärstandorten.`, `${de} sites – Germany is the country with the most foreign military sites in the dataset.`),
      base: 'ramstein-air-base',
    },
    {
      id: 'drones',
      q: L('Welche Basis in Deutschland gilt als Relaisstation für den US-Drohnenkrieg?', 'Which base in Germany serves as a relay station for the US drone war?'),
      options: [L('Grafenwöhr', 'Grafenwöhr'), L('Ramstein Air Base', 'Ramstein Air Base'), L('Büchel', 'Büchel'), L('Wiesbaden', 'Wiesbaden')],
      answer: 1,
      explain: L('Über die Satelliten-Relaisstation in Ramstein laufen die Signale für Drohneneinsätze in Afrika und Westasien.', 'Signals for drone strikes in Africa and West Asia are relayed via the satellite relay station at Ramstein.'),
      base: 'ramstein-air-base',
    },
    {
      id: 'nuclear',
      q: L('Wo in Deutschland lagern im Rahmen der „nuklearen Teilhabe“ US-Atomwaffen?', 'Where in Germany are US nuclear weapons stored under “nuclear sharing”?'),
      options: [L('Büchel (Eifel)', 'Büchel (Eifel)'), L('Spangdahlem', 'Spangdahlem'), L('Kalkar', 'Kalkar'), L('Stuttgart', 'Stuttgart')],
      answer: 0,
      explain: L(`Büchel ist einer von ${nuclear} erfassten Standorten der nuklearen Teilhabe in Europa – neben Kleine Brogel, Volkel, Aviano, Ghedi und Incirlik.`, `Büchel is one of ${nuclear} nuclear-sharing sites in Europe in the dataset – alongside Kleine Brogel, Volkel, Aviano, Ghedi and Incirlik.`),
      base: 'buechel-nato-air-base',
    },
    {
      id: 'okinawa',
      q: L('Auf welcher Insel konzentrieren sich die US-Basen in Japan?', 'On which island are US bases in Japan concentrated?'),
      options: [L('Hokkaido', 'Hokkaido'), L('Okinawa', 'Okinawa'), L('Kyushu', 'Kyushu'), L('Honshu', 'Honshu')],
      answer: 1,
      explain: L(`${okinawa} Standorte liegen auf Okinawa – die Insel macht weniger als 1 % der Fläche Japans aus. Gegen den Neubau in Henoko protestieren die Menschen seit Jahrzehnten.`, `${okinawa} sites are on Okinawa – an island making up less than 1 % of Japan’s territory. People have protested the new base at Henoko for decades.`),
      base: 'henoko-camp-schwab',
    },
    {
      id: 'djibouti',
      q: L('In welchem Land liegt Camp Lemonnier, die größte US-Basis in Afrika?', 'In which country is Camp Lemonnier, the largest US base in Africa?'),
      options: [L('Kenia', 'Kenya'), L('Niger', 'Niger'), L('Dschibuti', 'Djibouti'), L('Somalia', 'Somalia')],
      answer: 2,
      explain: L('Dschibuti am Horn von Afrika beherbergt gleich mehrere fremde Basen – neben den USA auch Frankreich, Italien, Japan und China.', 'Djibouti on the Horn of Africa hosts several foreign bases – besides the US also France, Italy, Japan and China.'),
      base: 'us-camp-lemonnier',
    },
    {
      id: 'diego',
      q: L('Für die Basis auf Diego Garcia wurde die gesamte Bevölkerung vertrieben. Wer betreibt sie?', 'The entire population was expelled for the base on Diego Garcia. Who runs it?'),
      options: [L('Frankreich', 'France'), L('Indien', 'India'), L('USA und Großbritannien', 'US and UK'), L('Australien', 'Australia')],
      answer: 2,
      explain: L('Ende der 1960er/1970er Jahre wurden die Chagossianer deportiert, um Platz für die britisch-amerikanische Basis zu schaffen.', 'In the late 1960s/1970s the Chagossians were deported to make room for the British–American base.'),
      base: 'diego-garcia-airport',
    },
    {
      id: 'shannon',
      q: L('Über welchen zivilen Flughafen im neutralen Irland reisen US-Truppen?', 'Through which civilian airport in neutral Ireland do US troops travel?'),
      options: [L('Dublin', 'Dublin'), L('Cork', 'Cork'), L('Shannon', 'Shannon'), L('Knock', 'Knock')],
      answer: 2,
      explain: L('Seit 2001 sind laut Shannonwatch rund drei Millionen bewaffnete US-Soldaten über Shannon geflogen – trotz der irischen Neutralität.', 'According to Shannonwatch, around three million armed US soldiers have passed through Shannon since 2001 – despite Irish neutrality.'),
      base: 'shannon-airport',
    },
  ];
}
