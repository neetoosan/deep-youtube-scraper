/**
 * YouTube Contact Scraper — Excel Builder
 *
 * Generates XLSX workbooks for YouTube scrape results.
 * Columns: Channel Name | Channel URL | Email(s) | Social(s) | Website | Subscribers | Comment Snippet
 *
 * Uses the same lightweight XLSX-from-scratch approach as the Edge Contact Scraper.
 */

function buildYouTubeWorkbook(results) {
  var rows = buildYouTubeRows(results);
  var sheetXml = buildSheetXml(rows);
  var title = results.videoTitle || results.query || "YouTube Contacts";
  var files = [
    {
      name: "[Content_Types].xml",
      data: xmlBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>\n  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>\n</Types>')
    },
    {
      name: "_rels/.rels",
      data: xmlBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>\n  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>\n</Relationships>')
    },
    {
      name: "docProps/app.xml",
      data: xmlBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>YouTube Contact Scraper</Application></Properties>')
    },
    {
      name: "docProps/core.xml",
      data: xmlBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + escapeXml(title) + '</dc:title><dc:creator>YouTube Contact Scraper</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:created></cp:coreProperties>')
    },
    {
      name: "xl/workbook.xml",
      data: xmlBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Contacts" sheetId="1" r:id="rId1"/></sheets></workbook>')
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: xmlBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    },
    {
      name: "xl/styles.xml",
      data: xmlBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>')
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: xmlBytes(sheetXml)
    }
  ];
  return createZip(files);
}

function buildYouTubeRows(results) {
  var header = [
    "Channel", "Email(s)", "Socials", "Website", "Subscribers"
  ];
  var rows = [header];

  var contacts = results.contacts || [];
  for (var i = 0; i < contacts.length; i++) {
    var c = contacts[i];
    // Double quotes inside string arguments of Excel formulas are escaped as double-double quotes ("")
    var cleanTitle = (c.channelTitle || "").replace(/"/g, '""');
    var channelCell = c.channelUrl ? `=HYPERLINK("${c.channelUrl}", "${cleanTitle}")` : (c.channelTitle || "");

    rows.push([
      channelCell,
      (c.emails || []).join(", "),
      (c.socials || []).join(", "),
      c.website || "",
      c.subscriberCount || ""
    ]);
  }

  return rows;
}

// ── Shared XLSX Utilities ──────────────────────────────────────────────────
// (Same lightweight ZIP + XML builder used in Edge Contact Scraper)

function buildSheetXml(rows) {
  var cols = rows[0] ? rows[0].length : 0;
  var endCol = colName(cols);

  // Define column widths for beautiful layout:
  // Column 1 (Channel): 30
  // Column 2 (Emails): 35
  // Column 3 (Socials): 30
  // Column 4 (Website): 30
  // Column 5 (Subscribers): 18
  var colWidths = [30, 35, 30, 30, 18];
  var colXml = '<cols>';
  for (var i = 0; i < cols; i++) {
    var w = colWidths[i] || 24;
    colXml += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
  }
  colXml += '</cols>';

  var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  xml += '<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
  xml += colXml;
  xml += '<sheetData>';

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var rowNum = r + 1;
    xml += '<row r="' + rowNum + '">';
    for (var c = 0; c < row.length; c++) {
      var ref = colName(c + 1) + rowNum;
      var val = row[c];
      if (val == null) val = "";
      val = String(val);
      var style = r === 0 ? ' s="1"' : '';
      if (val.startsWith("=")) {
        xml += '<c r="' + ref + '"' + style + '><f>' + escapeXml(val.slice(1)) + '</f></c>';
      } else {
        xml += '<c r="' + ref + '" t="inlineStr"' + style + '><is><t>' + escapeXml(val) + '</t></is></c>';
      }
    }
    xml += '</row>';
  }

  xml += '</sheetData>';
  xml += '<autoFilter ref="A1:' + endCol + rows.length + '"/>';
  xml += '</worksheet>';
  return xml;
}

function colName(n) {
  var name = "";
  while (n > 0) {
    n--;
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
}

function escapeXml(s) {
  return String(s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlBytes(str) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  var arr = [];
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code < 0x80) {
      arr.push(code);
    } else if (code < 0x800) {
      arr.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      arr.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(arr);
}

// ── Minimal ZIP creation ───────────────────────────────────────────────────

function createZip(files) {
  var localOffsets = [];
  var parts = [];
  var offset = 0;

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var nameBytes = xmlBytes(file.name);
    var data = file.data;

    localOffsets.push(offset);

    var header = new Uint8Array(30 + nameBytes.length);
    var view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    header.set(nameBytes, 30);

    parts.push(header);
    parts.push(data);
    offset += header.length + data.length;
  }

  var centralStart = offset;

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var nameBytes = xmlBytes(file.name);
    var data = file.data;

    var central = new Uint8Array(46 + nameBytes.length);
    var cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint32(42, localOffsets[i], true);
    central.set(nameBytes, 46);

    parts.push(central);
    offset += central.length;
  }

  var eocd = new Uint8Array(22);
  var ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, offset - centralStart, true);
  ev.setUint32(16, centralStart, true);
  parts.push(eocd);

  var totalLen = 0;
  for (var i = 0; i < parts.length; i++) totalLen += parts[i].length;
  var result = new Uint8Array(totalLen);
  var pos = 0;
  for (var i = 0; i < parts.length; i++) {
    result.set(parts[i], pos);
    pos += parts[i].length;
  }
  return result;
}
