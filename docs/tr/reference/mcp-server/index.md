---
title: MCP Sunucu Referansı
description: LenserFight MCP sunucusu — lensler, savaşlar ve iş akışları için 31 araç. Claude Code, Cursor veya Claude.ai'yi LF Cloud veya yerel stdio üzerinden dakikalar içinde bağlayın.
---

# MCP Sunucu Referansı

LenserFight MCP sunucusu, [Model Context Protocol (Model Bağlam Protokolü)](https://modelcontextprotocol.io) aracılığıyla Lensler, Savaşlar ve İş Akışları olmak üzere üç alanda **31 aracı** kullanıma sunar. MCP uyumlu herhangi bir yapay zeka asistanı (Claude Code, Cursor, Claude.ai), bir konuşma içinden doğrudan LenserFight kaynaklarını okuyabilir, oluşturabilir ve yürütebilir.

## Hızlı başlangıç

**En hızlı yol — Claude.ai'yi 2 dakika içinde LF Cloud'a bağlayın:**

1. **claude.ai → Ayarlar (Settings) → Bağlayıcılar (Connectors) → Özel bağlayıcı ekle (Add custom connector)** adımlarını izleyin.
2. URL alanını şu şekilde ayarlayın:
   ```
   https://mcp.lenserfight.com/mcp
   ```
3. Client ID ve Secret alanlarını boş bırakın. **Ekle (Add)** seçeneğine tıklayın.
4. Yetkilendirme penceresi açıldığında LenserFight hesabınızla giriş yapın.

Tüm bağlantı modları ve sorun giderme için [Kurulum (Setup)](/en/reference/mcp-server/setup) sayfasına bakın.

---

## Araçlara genel bakış

Her araç adı sektör standardı `fiil_isim` formunu izler (örn. `list_lenses`, `get_battle`, `run_workflow`) — Anthropic'in referans bağlayıcılarında (Gmail: `list_labels`, `get_thread`, `create_draft`) kullanılan kalıbın aynısı.

Her sayfa, araçları **güvenlik sınıfına** göre gruplar — `Read`, `Write`, `Execute`, `Destructive` — böylece bir host, araç başına değil sınıf başına onay isteyebilir.

| Grup | Araç Sayısı | Read · Write · Execute · Destructive |
|---|---|---|
| [Lens araçları](/en/reference/mcp-server/tools-lens) | 15 | 7 · 4 · 2 · 2 |
| [Savaş araçları](/en/reference/mcp-server/tools-battle) | 8 | 4 · 4 · 0 · 0 |
| [İş akışı araçları](/en/reference/mcp-server/tools-workflow) | 8 | 5 · 1 · 2 · 0 |
| **Toplam** | **31** | **16 · 9 · 4 · 2** |

---

## Bağlantı modları

| Mod | İstemci | Ne zaman kullanılır? |
|---|---|---|
| **LF Cloud** | Claude.ai web, herhangi bir HTTP MCP istemcisi | Yerel kurulum gerekmez — doğrudan barındırılan uç noktaya bağlanın |
| **stdio** | Claude Code CLI, Cursor masaüstü | Depo içindeki yerel geliştirme — en hızlısı, ağ erişimine ihtiyaç duymaz |
| **HTTP + tünel** | Claude.ai web (yerel geliştirme) | LF Cloud'a yüklemeden önce yerel MCP değişikliklerini test etme |

Her mod için tam talimatlar: [Kurulum (Setup)](/en/reference/mcp-server/setup).

---

## Nasıl çalışır?

Sunucu, `@modelcontextprotocol/sdk` kullanılarak oluşturulmuştur. 

**stdio modunda**, başlangıçta tek bir service-role Supabase istemcisi oluşturulur ve tüm istekler arasında paylaşılır. Bu, RLS korumalarını atlar ve yalnızca güvenilir yerel kullanım için uygundur.

**HTTP modunda** (LF Cloud veya yerel tünel), her istek bir lenser kimliğiyle çözümlenen bir taşıyıcı jeton (bearer token) taşır. RLS normal şekilde uygulanır.

Her araç, bir Supabase RPC işlevine (örneğin `fn_mcp_lens_list`, `fn_battles_submit`) yetki devreder. Hiçbir araç doğrudan üçüncü taraf bir LLM çağırmaz. Bunun en belirgin örneği `run_lens` aracıdır: şablondaki `[[Parameter]]` belirteçlerini çözer ve tamamlanmış bir istem (prompt) dizesi döndürür — bu istemi yürüten şey çağıran asistanın kendisidir.

---

## Hızlı bağlantılar

- [Kurulum ve yapılandırma (Setup)](/en/reference/mcp-server/setup) — üç bağlantı modunun tamamı, ortam değişkenleri, sorun giderme
- [Kimlik doğrulama (Authentication)](/en/reference/mcp-server/authentication) — jeton türleri, OAuth PKCE akışı, uzun ömürlü MCP jetonları
- [Lens araçları](/en/reference/mcp-server/tools-lens) — parametre tablolarıyla birlikte 15 aracın tamamı
- [Savaş araçları](/en/reference/mcp-server/tools-battle) — parametre tablolarıyla birlikte 8 aracın tamamı
- [İş akışı araçları](/en/reference/mcp-server/tools-workflow) — parametre tablolarıyla birlikte 8 aracın tamamı

---

## Kaynak

- Uygulama: [`apps/mcp-server`](https://github.com/conectlens/lenserfight/tree/main/apps/mcp-server)
- Edge işlevi: [`supabase/functions/lenserfight-mcp`](https://github.com/conectlens/lenserfight/tree/main/supabase/functions/lenserfight-mcp)
- Yerel kayıt: [`.mcp.json`](https://github.com/conectlens/lenserfight/blob/main/.mcp.json)
