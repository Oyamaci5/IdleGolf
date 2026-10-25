# Scritchy Scratchy: Teknoloji Yığını ve Envanter (Faz 1)

> Kapsam: `D:\SteamLibrary\steamapps\common\Scritchy Scratchy` kurulumu salt-okunur olarak incelendi. Hiçbir oyun dosyası değiştirilmedi, yamalanmadı ya da kopyalanmadı. İstekte geçen ikinci yol (`C:\Program Files (x86)\Steam\steamapps\common\Scratch Scratchy`) diskte **yok**. `steamapps\common` altında yalnızca `Steam Controller Configs` ve `Steamworks Shared` klasörleri bulunuyor. **(confirmed)**
>
> Güven seviyeleri:
> - **confirmed**: kodda, metadata'da ya da dosya başlığında doğrudan görüldü.
> - **likely**: veri dosyasından okundu ya da güçlü bir çıkarım.
> - **hypothesis**: kanıtı zayıf bir tahmin.

## 1. Klasör envanteri

| Yol | Boyut | Ne olduğu |
|---|---|---|
| `ScritchyScratchy.exe` | 671 744 B | Unity player başlatıcısı (PE32+, x64). SHA-256 `e0366c38…7a` |
| `UnityPlayer.dll` | 34.4 MB | Unity motor çalışma zamanı |
| `GameAssembly.dll` | 64.9 MB | **IL2CPP ile native'e derlenmiş tüm C# kodu**. SHA-256 `cb46a606…ea42` |
| `baselib.dll`, `UnityCrashHandler64.exe`, `D3D12\D3D12Core.dll` | | Motor yardımcıları, D3D12 Agility SDK |
| `ScritchyScratchy_Data\il2cpp_data\Metadata\global-metadata.dat` | 15.3 MB | IL2CPP metadata: tip, metot ve alan adları, string literal'lar. Sürüm **31**, şifresiz. SHA-256 `8fe01edd…4691` |
| `ScritchyScratchy_Data\sharedassets2.assets` | 166 KB | **Ekonomi verisi**: 15 JSON TextAsset |
| `level0`, `level1`, `level2` | | Sahneler. `level1` ana oyun sahnesi; MonoBehaviour serileştirilmiş alanları burada |
| `globalgamemanagers(.assets)` | | Proje ayarları, 4094 MonoScript kaydı |
| `StreamingAssets\aa\…` | | Addressables 2.9.1 kataloğu ve lokalizasyon bundle'ları (16 dil, Türkçe dahil) |
| `Plugins\x86_64\steam_api64.dll` | | Steamworks.NET 2025.163.0, SDK 1.63 (`Plugins\Steamworks.NET.txt`) |
| `Plugins\x86_64\lib_burst_generated.dll`, `libonigwrap.dll` | | Burst ile derlenmiş kod, Oniguruma regex sarmalayıcısı |

## 2. Motor ve sürüm

| Bulgu | Kanıt | Güven |
|---|---|---|
| **Unity 6000.0.83f1** (Unity 6 LTS) | `globalgamemanagers` başlığı, offset 0x30: `6000.0.83f1`. Tüm SerializedFile'larda `unityVersion` alanı aynı | confirmed |
| Betik arka ucu **IL2CPP** (Mono değil) | `Assembly-CSharp.dll` diskte yok. Bunun yerine `GameAssembly.dll` ve `global-metadata.dat` var. Metadata sihirli değeri `0xFAB11BAF`, sürüm 31 | confirmed |
| Yayıncı/Ürün: "Lunch Money Games" / "Scritchy Scratchy" | `ScritchyScratchy_Data\app.info` | confirmed |
| Render: URP 2D | `ScriptingAssemblies.json`: `Unity.RenderPipelines.Universal.2D.Runtime.dll` | confirmed |
| Platform hedefleri: Steam, Xbox/GDK, Switch, iOS/Android izleri | `SteamAchievementManager`, `Unity.Microsoft.GDK.dll`, `SwitchManager`, `AppleGameCenterManager`, `GooglePlayManager`, `MobileDisablePrestige` tipleri | confirmed (kodda var). Hangi platformda aktif olduğu: hypothesis |

## 3. Kod derlemeleri (assembly'ler)

`ScriptingAssemblies.json` ve metadata image tablosuna göre 116 image var. Oyuna özgü olanlar:

| Assembly | Tip sayısı | Not |
|---|---|---|
| **Assembly-CSharp.dll** | 424 | Oyunun kendi kodu: ekonomi, prestij, kayıt |
| Assembly-CSharp-firstpass.dll | 81 | DOTween modülleri, GPGSIds |
| PlatformSaveTransfer.dll | 12 | Bulut kayıt aktarımı (`UnityCloudSaveStore`) |

**Kütüphaneler ve eklentiler** (hepsi confirmed, `ScriptingAssemblies.json`):

- Newtonsoft.Json (kayıt dosyası serileştirme)
- DOTween (tween animasyonları)
- Febucci TextAnimator (metin animasyonu)
- Lofelt NiceVibrations (dokunsal geri bildirim)
- Unity Localization
- Unity Addressables
- Unity Input System
- TextMeshPro
- Unity Services: Analytics, Authentication, CloudSave, CloudCode
- Unity Purchasing (IAP)
- websocket-sharp
- Unity Visual Scripting (paket olarak dahil; kullanımı belirsiz)
- `MCPForUnity.Runtime.dll`: geliştirici araç izi. Oyun mantığına etkisi görülmedi (hypothesis).

## 4. En faydalı analiz hedefi

| Hedef | Değerlendirme |
|---|---|
| `Assembly-CSharp.dll` | **Yok.** IL2CPP derlemesi olduğu için yönetilen (managed) DLL gönderilmemiş |
| `app.asar` | **Yok.** Electron uygulaması değil |
| `ScritchyScratchy.exe` | Sadece başlatıcı. Oyun mantığı içermiyor |
| **`global-metadata.dat` + `GameAssembly.dll`** | **Asıl hedef.** Metadata tip, alan ve metot adlarını ve sabitleri verir. DLL ise native kodu (formülleri) içerir |
| **`sharedassets2.assets`** | **İkinci asıl hedef.** Tüm ekonomi tabloları düz JSON TextAsset olarak burada (UpgradeData, TicketData, PerkData, ProgressionGoalData…) |
| `level1` | Sahnedeki MonoBehaviour değerleri (ör. `PrestigeManager.prestigeCurrencyMult = 5`, `AutoSaver.timeBetweenAutoSaves = 120`) |

## 5. Yöntem, araçlar ve sınırlamalar

- **REA** ile:
  - `inspect_pe_resources(ScritchyScratchy.exe)` çalıştırıldı (Evidence `ev_a38f50311673e55013cbf8573d45b4457e8e64a9707c1639e61fc0a381fe8ed1`). Kaynak tablosu 12 kaynak ve 9 ikon içeriyor; oyun mantığı yok.
  - `binary_session` ile sağlayıcılar kontrol edildi. Bu makinede REA'nın native decompiler sağlayıcıları **kullanılamıyor**:
    - Ghidra: `GHIDRA_INSTALL_DIR` ayarlı değil
    - IDA: yapılandırılmamış
    - Hopper: Windows'ta desteklenmiyor
    - objdump: `ERR_REA_WINDOWS_NATIVE`
- **Yedek yöntem.** Hepsi salt-okunur, oyun dosyalarına yazmadan:
  1. Kendi Python ayrıştırıcım ile `global-metadata.dat` v31 tabloları okundu: tipler, alanlar, metotlar, `fieldDefaultValues`, string literal'lar.
  2. `GameAssembly.dll` içinde `Il2CppCodeGenModule` ("Assembly-CSharp.dll", 3098 metot işaretçisi, VA `0x182D55290`) ve `Il2CppMetadataRegistration` (fieldOffsets, VA `0x1833554F0`) bulundu. Böylece metot adı → native adres eşlemesi ve alan offset'leri çıkarıldı.
  3. İlgili fonksiyonlar `capstone 5.0.7` ile disassemble edildi. Bu kütüphane yalnızca scratchpad içindeki izole bir venv'e kuruldu.
  4. Unity SerializedFile v22 için küçük bir ayrıştırıcı yazıldı. Bununla JSON TextAsset'ler ve MonoBehaviour alanları okundu.
- Kanıt olarak metin içinde **sınıf.metot @ VA** verildi (ör. `Helper.GetPrice @ 0x1804E5860`). Görüntü tabanı `0x180000000`.
- **Sınırlamalar:**
  - Disassembly'den formül çıkarımı elle yapıldı; decompiler çıktısı yok.
  - `0x180480450` adresindeki fonksiyonun `powf` olduğu çağrı bağlamından çıkarıldı (likely).
  - Oyun çalıştırılmadı, çalışma zamanı gözlemi yok.
  - Yerel kayıt klasörü (`%USERPROFILE%\AppData\LocalLow\Lunch Money Games\Scritchy Scratchy`) yalnızca alan yapısını ve tempo kalibrasyonunu doğrulamak için okundu. Hiçbir şey yazılmadı.
