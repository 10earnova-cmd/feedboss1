import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db } from '../../lib/db'
import type { Ad, AdSlot } from '../../types'

function emptyAd(id: string, slot: AdSlot, name: string): Ad {
  return {
    id,
    slot,
    name,
    type: 'direct_link',
    scriptCode: '',
    html: '',
    url: '',
    url2: '',
    url3: '',
    labelEn: '',
    labelBn: '',
    enabled: false,
  }
}

export function AdminAds() {
  const { ads, refresh } = useSite()
  const poster = ads.find((a) => a.slot === 'poster_click')
  const below = ads.find((a) => a.slot === 'below_player')

  const save = async (current: Ad | undefined, fallback: Ad, patch: Partial<Ad>) => {
    await db.saveAd({ ...(current || fallback), ...patch, type: 'direct_link' })
    await refresh()
  }

  return (
    <div className="max-w-xl space-y-8">
      <Seo title="Ad links | Admin" />
      <div>
        <h1 className="text-2xl font-bold">Direct ad links</h1>
        <p className="mt-2 text-sm text-muted">
          Grid posters use 1st / 2nd / 3rd click. After someone opens a video, a random rotating home-style poster can sit under the player with one link.
        </p>
      </div>

      <section className="card p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={Boolean(poster?.enabled)}
            onChange={(e) =>
              void save(poster, emptyAd('ad_poster', 'poster_click', 'Poster clicks'), { enabled: e.target.checked })
            }
          />
          Enable poster clicks
        </label>
        <p className="mt-2 text-xs text-muted">Every home / related poster. Empty field = open the video.</p>
        {poster?.enabled ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted">1st click</label>
              <input
                className="input mt-1"
                value={poster?.url || ''}
                placeholder="https://otieu.com/4/..."
                onChange={(e) =>
                  void save(poster, emptyAd('ad_poster', 'poster_click', 'Poster clicks'), { url: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted">2nd click</label>
              <input
                className="input mt-1"
                value={poster?.url2 || ''}
                placeholder="https://otieu.com/4/..."
                onChange={(e) =>
                  void save(poster, emptyAd('ad_poster', 'poster_click', 'Poster clicks'), { url2: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted">3rd click (and later)</label>
              <input
                className="input mt-1"
                value={poster?.url3 || ''}
                placeholder="https://otieu.com/4/..."
                onChange={(e) =>
                  void save(poster, emptyAd('ad_poster', 'poster_click', 'Poster clicks'), { url3: e.target.value })
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() =>
                void save(poster, emptyAd('ad_poster', 'poster_click', 'Poster clicks'), {
                  url: '',
                  url2: '',
                  url3: '',
                  enabled: false,
                })
              }
            >
              Remove poster links
            </button>
          </div>
        ) : null}
      </section>

      <section className="card p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={Boolean(below?.enabled)}
            onChange={(e) =>
              void save(below, emptyAd('ad_player', 'below_player', 'Below player poster'), { enabled: e.target.checked })
            }
          />
          Enable below-player poster
        </label>
        <p className="mt-2 text-xs text-muted">
          One direct link. The poster shows a random video from the home feed and rotates like the grid thumbs.
        </p>
        {below?.enabled ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted">Direct link</label>
              <input
                className="input mt-1"
                value={below?.url || ''}
                placeholder="https://otieu.com/4/..."
                onChange={(e) =>
                  void save(below, emptyAd('ad_player', 'below_player', 'Below player poster'), { url: e.target.value })
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() =>
                void save(below, emptyAd('ad_player', 'below_player', 'Below player poster'), {
                  url: '',
                  enabled: false,
                })
              }
            >
              Remove below-player link
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
