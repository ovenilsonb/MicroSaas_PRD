$json = Get-Content 'insumos_restaurar.json' -Raw -Encoding UTF8
Invoke-RestMethod -Uri 'https://bcuulehsapkricicbtpx.supabase.co/rest/v1/ingredients' -Method POST -Header @{
    'apikey' = 'sb_publishable_iVn4bv6-hiiOUsE1fFU7sQ_hxYhKbA6'
    'Authorization' = 'Bearer sb_publishable_iVn4bv6-hiiOUsE1fFU7sQ_hxYhKbA6'
    'Content-Type' = 'application/json'
    'Prefer' = 'resolution=merge-duplicates'
} -Body $json
