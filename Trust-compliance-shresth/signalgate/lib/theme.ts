/** Inline script run before paint so the saved theme (light | dark | system) never flashes. */
export const THEME_KEY = "signalgate-theme";
export const themeBootScript = `try{var m=localStorage.getItem("${THEME_KEY}")||"dark";var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}`;
