export default function Footer() {
  return (
    <footer className="border-t border-border pt-6 mt-10">
      <div className="flex justify-center items-center gap-6 text-muted-foreground text-xs">
        <a href="/terms" className="hover:text-foreground transition-colors">
          利用規約
        </a>
        <span>|</span>
        <a href="/privacy" className="hover:text-foreground transition-colors">
          プライバシーポリシー
        </a>
        <span>|</span>
        <a href="/about" className="hover:text-foreground transition-colors">
          このサイトについて
        </a>
      </div>
      <div className="mt-3 text-center text-muted-foreground text-xs mb-6">
        このサイトは Google Gemini または Google Canvas とは関係のない、非公式のユーザー投稿型フォーラムです。

      </div>
    </footer>
  );
}