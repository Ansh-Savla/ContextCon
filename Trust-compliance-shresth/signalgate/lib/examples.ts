/** Demo requests (US + India). Synthetic ones use fictitious people and lookalike domains and are labelled. */
export type Example = { id: string; market: "India" | "US"; requester: "investor" | "lender"; title: string; persona: string; text: string };

export const EXAMPLES: Example[] = [
  {
    id: "bluepine-pitch", market: "India", requester: "investor", title: "BluePine — pre-investment diligence", persona: "India seed fund analyst",
    text: `---------- Forwarded message ---------
From: partner
Subject: Fwd: BluePine Industries - Shark Tank India S1

pls run diligence on BluePine Industries (frozen momos, Delhi NCR) before our Rs 75 lakh cheque.
They say Shark Tank India deal Rs 75 lakh for 12%, founders Aditi Bhutia Madan and Naveen Panwar run it together,
team of ~20 now. Thesis: India consumer food brands, seed-Series A, min heartbeat 40.
site: bluepinefoods.com`,
  },
  {
    id: "bluepine-wire", market: "India", requester: "investor", title: "BluePine — closing wire instructions", persona: "Fund ops at closing",
    text: `SYNTHETIC DEMO INPUT
From: Rohit Sample <rohit.sample@bluepinefoods-payments.in>
Subject: URGENT: revised wire details for your Rs 75 lakh investment

Hi, I am the new CFO at BluePine Foods. Our bank account has changed — please wire the Rs 75 lakh
SAFE tranche to the new account below before Friday's closing. Thanks!`,
  },
  {
    id: "verbalizeit-followon", market: "US", requester: "investor", title: "VerbalizeIt — follow-on request", persona: "US VC partner",
    text: `VerbalizeIt (verbalizeit.com, Shark Tank season 4, human translation) is raising a $500K bridge.
They say they have 45 people and spend ~$27K/month on Google Ads. Worth a follow-on cheque?`,
  },
  {
    id: "misto-screen", market: "US", requester: "investor", title: "Misto — first screen", persona: "US seed associate",
    text: `hey, can you screen Misto for me (mistobox.com)? coffee subscription co from Shark Tank,
founders say founded 2012, team of ~10, and they got a Shark deal.
our thesis: US consumer subscription, under 50 staff, founded before 2015, min heartbeat 40.`,
  },
  {
    id: "wgc-credit", market: "US", requester: "lender", title: "Wicked Good Cupcakes — working-capital line", persona: "US fintech lender (KYB)",
    text: `Loan application
Business name: Wicked Good Cupcakes
Website: wickedgoodcupcakes.com
HQ: Massachusetts, USA
Established: 2011
Employees: 150
Ownership: family-owned, independent
Request: $250K working-capital line of credit for holiday inventory.`,
  },
  {
    id: "tomandchee-loan", market: "US", requester: "lender", title: "Tom + Chee — expansion loan", persona: "US commercial lender",
    text: `Credit memo request: Tom + Chee (tomandchee.com) wants a $2M term loan to open new stores.
Borrower states it is independent, founded 2009, ~1,000 staff and $500M+ revenue. Please run KYB and credit readiness.`,
  },
  {
    id: "zeta-line", market: "India", requester: "lender", title: "Zeta — name-only credit line", persona: "India NBFC credit analyst",
    text: `supplier "Zeta" wants a Rs 2 crore working capital loan on net-60 terms, says they have 500 staff. can we lend?`,
  },
];
