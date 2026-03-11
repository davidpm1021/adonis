import localFont from "next/font/local";

export const jetbrainsMono = localFont({
  src: [
    {
      path: "../fonts/JetBrainsMono-Variable.ttf",
      style: "normal",
    },
    {
      path: "../fonts/JetBrainsMono-Italic-Variable.ttf",
      style: "italic",
    },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const ibmPlexSans = localFont({
  src: [
    {
      path: "../fonts/IBMPlexSans-Variable.ttf",
      style: "normal",
    },
    {
      path: "../fonts/IBMPlexSans-Italic-Variable.ttf",
      style: "italic",
    },
  ],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});
