"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { buildSharedMatchUrl } from "@/features/matchmaking/application/shareMatchup";
import type { MatchupResult } from "@/features/matchmaking/model/types";

type PrintShareQrProps = {
  result: MatchupResult;
};

function currentOriginUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/`;
}

export function PrintShareQr({ result }: PrintShareQrProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const shareUrl = useMemo(
    () => buildSharedMatchUrl(result, currentOriginUrl()),
    [result],
  );

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: "#2f261b",
        light: "#ffffff",
      },
    }).then((qrCode) => {
      if (active) {
        setQrCodeDataUrl(qrCode);
      }
    }).catch(() => {
      if (active) {
        setQrCodeDataUrl(null);
      }
    });

    return () => {
      active = false;
    };
  }, [shareUrl]);

  return (
    <section
      data-testid="print-share-qr-section"
      className="mt-4 flex justify-end print:mt-[10px] print:break-inside-avoid"
    >
      <div className="w-full max-w-[220px] rounded-[1.2rem] border border-[var(--color-line)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f5f1e8_100%)] p-4 text-center print:max-w-[180px] print:rounded-none print:border-[#cfc6b7] print:bg-white print:p-[10px]">
        <p className="text-sm font-semibold text-[var(--color-ink)] print:text-[11px]">
          組合せQR
        </p>
        <p className="mt-1 text-xs leading-6 text-[var(--color-muted)] print:text-[9px] print:leading-4">
          この紙から同じ対戦表を開けます
        </p>
        <div className="mt-3 flex justify-center">
          {qrCodeDataUrl ? (
            <Image
              data-testid="print-share-qr-image"
              src={qrCodeDataUrl}
              alt="組合せ共有用QRコード"
              width={128}
              height={128}
              unoptimized
              className="h-32 w-32 rounded-[1rem] border border-[var(--color-line)] bg-white p-2 print:h-[96px] print:w-[96px] print:rounded-none print:border-[#cfc6b7] print:p-[6px]"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-[1rem] border border-[var(--color-line)] bg-white px-3 text-xs leading-5 text-[var(--color-muted)] print:h-[96px] print:w-[96px] print:rounded-none print:border-[#cfc6b7]">
              QRコードを準備中...
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
