import test from "node:test";
import assert from "node:assert/strict";
import { descriptionToText } from "../shared/description-text";

test("Descrizioni HTML diventano testo normale con soli a capo", () => {
  assert.equal(descriptionToText("<p>Prima <strong>riga</strong></p><p>Seconda<br>Terza</p>"), "Prima riga\nSeconda\nTerza");
  assert.equal(descriptionToText("<h2>Titolo</h2><ul><li>Uno</li><li>Due</li></ul>"), "Titolo\nUno\nDue");
  assert.equal(descriptionToText("&lt;p&gt;Prima&lt;/p&gt;&lt;p&gt;Seconda&lt;/p&gt;"), "Prima\nSeconda");
  assert.equal(descriptionToText("&amp;lt;p&amp;gt;Caff&amp;egrave;&amp;lt;/p&amp;gt;"), "Caffè");
});

test("Testo normale, righe vuote e ritorni Windows restano corretti", () => {
  assert.equal(descriptionToText("Uno\r\nDue\rTre"), "Uno\nDue\nTre");
  assert.equal(descriptionToText("Uno\n\n\nDue"), "Uno\n\n\nDue");
  assert.equal(descriptionToText("Uno\n", {trim:false}), "Uno\n");
  assert.equal(descriptionToText("Zuccheri < 5, ABV > 3 e <0.5%"), "Zuccheri < 5, ABV > 3 e <0.5%");
  assert.equal(descriptionToText("È una birra 日本語 &amp; caff&egrave; &#x1F37A;"), "È una birra 日本語 & caffè 🍺");
});

test("Codice, stili e commenti HTML non diventano descrizioni o contenuti attivi", () => {
  assert.equal(descriptionToText('<p>Buono</p><script>alert(1)</script><style>body{color:red}</style><!-- segreto -->'), "Buono");
  assert.equal(descriptionToText('<p style="font-size:50px">Testo <a href="javascript:alert(1)">normale</a></p>'), "Testo normale");
  assert.equal(descriptionToText("<p><br></p>"), "");
  assert.equal(descriptionToText(null), "");
});
