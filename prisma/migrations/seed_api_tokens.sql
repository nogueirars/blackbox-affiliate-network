-- Seed API tokens and URLs for casas_aposta
-- Run in Supabase SQL Editor after add_producao_dados.sql
-- Match by nome_exibicao (adjust names if they differ in your DB)

-- ── Smartico (boapi.smartico.ai) ──────────────────────────────────────────────
UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi.smartico.ai/api/af2_media_report_af',
  api_token     = '0ef5a498-42fd-11f0-b0cb-068c3067dc9d-413421',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%upbet%' OR nome_exibicao ILIKE '%up bet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi.smartico.ai/api/af2_media_report_af',
  api_token     = '53491628-ae27-11ee-b62d-0a499b262305-201599',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%estrela%bet%' AND nome_exibicao NOT ILIKE '%vip%' AND nome_exibicao NOT ILIKE '%2%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi.smartico.ai/api/af2_media_report_af',
  api_token     = '05fddfaa-0b16-11f0-aef5-068c3067dc9d-105462',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%estrela%bet%2%' OR nome_exibicao ILIKE '%estrelabet2%';

-- ── Smartico (boapi3.smartico.ai) ─────────────────────────────────────────────
UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '1062dfc4-4d13-11f0-b10d-027e66b7665d-525742',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%zero%um%' OR nome_exibicao ILIKE '%zeroum%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '5edd9ac0-4d10-11f0-b10d-027e66b7665d-525557',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%aposta%online%' OR nome_exibicao ILIKE '%apostaonline%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '17ecff08-2c1c-11f0-ae78-027e66b7665d-516139',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%jogo%de%ouro%' OR nome_exibicao ILIKE '%jogedeouro%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '9c8f273e-2075-11f0-ad41-027e66b7665d-515713',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%multibet%' OR nome_exibicao ILIKE '%multi%bet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '3832ba1a-88d7-11f0-b5fe-027e66b7665d-539762',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%geralbet%' OR nome_exibicao ILIKE '%geral%bet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '9cdfabf6-ee06-11ef-aba6-027e66b7665d-495549',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%bateu%bet%2%' OR nome_exibicao ILIKE '%bateubet2%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '64feecbe-e4d9-11ef-ab40-027e66b7665d-489148',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%hanz%bet%' OR nome_exibicao ILIKE '%hanzbet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = 'edd2c662-4d3b-11f0-b10f-027e66b7665d-480948',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%bateu%bet%' AND nome_exibicao NOT ILIKE '%2%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '50d77f76-04c3-11f0-ac63-027e66b7665d-453232',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%donald%bet%' OR nome_exibicao ILIKE '%donaldbet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '2be8fe5a-ab55-11ef-a585-0228c1221b89-450377',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%z%do%pix%' OR nome_exibicao ILIKE '%zedopix%' OR nome_exibicao ILIKE '%z%pix%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '14c4239a-92db-11ef-a3fa-0228c1221b89-434106',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%metgol%' OR nome_exibicao ILIKE '%met%gol%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = 'e2c6c6b4-0507-11f0-ac63-027e66b7665d-509657',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%mcgames%' OR nome_exibicao ILIKE '%mc%games%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '5ce3d806-bbb1-11ef-a70c-0228c1221b89-417679',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%bet%da%sorte%' OR nome_exibicao ILIKE '%betdasorte%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '8761fd6e-e13d-11ee-9abc-0228c1221b89-210263',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%golde%bet%' OR nome_exibicao ILIKE '%goldebet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '73d9bf94-0892-11ef-9bc0-0228c1221b89-269159',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%br4%bet%' OR nome_exibicao ILIKE '%br4bet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '41bbfcc6-12d2-11ef-9c3b-0228c1221b89-280008',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%esportiva%' AND nome_exibicao NOT ILIKE '%vip%' AND nome_exibicao NOT ILIKE '%bet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '714af576-54bf-11ef-9f90-0228c1221b89-358108',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%cassino%max%' OR nome_exibicao ILIKE '%cassinomax%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '3337798a-5415-11ef-9f7a-0228c1221b89-357160',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%brisa%bet%' OR nome_exibicao ILIKE '%brisabet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '5ec7821c-54f5-11ef-9f9f-0228c1221b89-358106',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%loto%green%' OR nome_exibicao ILIKE '%lotogreen%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = 'a779b208-54f7-11ef-9fa2-0228c1221b89-358110',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%strike%777%' OR nome_exibicao ILIKE '%strike777%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '39dbffe8-6475-11ef-a0e6-0228c1221b89-359220',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%netuno%bet%' OR nome_exibicao ILIKE '%netunobet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '87f99be4-6ac0-11ef-a156-0228c1221b89-373279',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%elisa%bet%' OR nome_exibicao ILIKE '%elisabet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '93ff8120-655b-11ef-a0f9-0228c1221b89-367288',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%trofeu%bet%' OR nome_exibicao ILIKE '%trofeubet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = 'b2a80290-7f69-11f0-b541-027e66b7665d-537211',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%ginga%bet%' OR nome_exibicao ILIKE '%gingabet%';

UPDATE public.casas_aposta SET
  api_url_base  = 'https://boapi3.smartico.ai/api/af2_media_report_af',
  api_token     = '74e669ec-8a59-11f0-b61c-027e66b7665d-539775',
  api_auth_type = 'HEADER_SIMPLES',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%mma%bet%' OR nome_exibicao ILIKE '%mmabet%';

-- ── Betano (XML query_param) ──────────────────────────────────────────────────
UPDATE public.casas_aposta SET
  api_url_base  = 'https://affiliateslatam.betano.com/api/affreporting.asp?reportname=ACIDReport&reportformat=xml&reportmerchantid=0&reportdisplayby=Site%2CDate',
  api_token     = 'd156a081df104add82dfb25846269ad2',
  api_auth_type = 'QUERY_PARAMETER',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%betano%';

-- ── SuperBet (XML query_param) ────────────────────────────────────────────────
UPDATE public.casas_aposta SET
  api_url_base  = 'https://affiliates.superbet.com/api/affreporting.asp?reportname=ACIDReport&reportformat=xml&reportmerchantid=0&reportdisplayby=Site%2CDate',
  api_token     = 'ed4d1df07e2a4996afc5b3eb4ad65643',
  api_auth_type = 'QUERY_PARAMETER',
  tipo_integracao = 'API'
WHERE nome_exibicao ILIKE '%superbet%' AND nome_exibicao NOT ILIKE '%ninja%';
