import React from "react";
import type { EditorPageId } from "./pages";

import HomepageEditor from "./editors/HomepageEditor";
import AboutusEditor from "./editors/AboutusEditor";
import HerdEditor from "./editors/HerdEditor";
import HighlandCattleEditor from "./editors/HighlandcattleEditor";
import ContactEditor from "./editors/ContactEditor";

export default function EditorRouter(props: {
  pageId: EditorPageId;
  onBack: () => void;
}) {
  switch (props.pageId) {
    case "home":
      return <HomepageEditor onBack={props.onBack} />;
    case "about":
      return <AboutusEditor onBack={props.onBack} />;
    case "herd":
      return <HerdEditor onBack={props.onBack} />;
    case "cattle":
      return <HighlandCattleEditor onBack={props.onBack} />;
    case "contact":
      return <ContactEditor onBack={props.onBack} />;
    default:
      return null;
  }
}
