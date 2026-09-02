import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The favicon is generated from the supplied logo rather than redrawn, so the
 * tab icon and the in-app mark are the same artwork.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public", "nnneva-logo.png"));

  return new ImageResponse(
    (
      // The PNG carries its own whitespace margin, so it is scaled past the
      // frame and pulled back by the same 138% / -19% the app mark uses.
      <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
        <img
          width={44}
          height={44}
          style={{ marginTop: -6, marginLeft: -6 }}
          src={`data:image/png;base64,${logo.toString("base64")}`}
          alt=""
        />
      </div>
    ),
    size,
  );
}
