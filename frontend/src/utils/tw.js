// src/utils/tw.js
export const cx = (...classes) =>
  classes.filter(Boolean).join(" ");

export const styles = {
  card: "bg-ui.card rounded-xl border border-ui.border shadow-card overflow-hidden transition-transform duration-200",
  cardHover: "hover:shadow-card-hover hover:-translate-y-1",
  cardPadding: "p-5 md:p-6",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-95 transition",

  btnOutline:
    "inline-flex items-center justify-center gap-2 bg-white border-2 border-primary-300 hover:border-primary-500 text-primary-600 hover:text-primary-700 font-bold rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500",

  btnGhost:
    "inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-slate-500",

  subtleMeta: "text-xs text-ui.muted",

  pill: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
};
