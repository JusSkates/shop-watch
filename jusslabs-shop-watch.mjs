#!/usr/bin/env node
// JusSlabs shop watch: scans Torecacamp, Card Rush and Hareruya 2 once, compares with the previous run
// and writes a picture report of what is new, repriced or gone.
//
//   node jusslabs-shop-watch.mjs            scan all three shops
//   node jusslabs-shop-watch.mjs --only=tc,h2   scan some (tc, cr, h2)
//
// Needs Node 18 or newer. Output goes in a "shop-watch" folder next to this file:
//   report.html (latest), reports/YYYY-MM-DD.html (history), state.json (what was in stock last run).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* <core> */

  // Shared middles for handles that only differ by one word.
  const QCP = 'qcp-K-%E3%82%AF%E3%82%A4%E3%83%83%E3%82%AF-%E3%82%B3%E3%83%B3%E3%83%88%E3%83%A9%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3-%E3%83%91%E3%83%83%E3%82%AF-%E3%82%BF%E3%82%A4%E3%83%97%E3%83%A6%E3%83%8B%E3%83%83%E3%83%88';
  const PTGFT = '-%E3%83%9D%E3%82%B1%E3%83%A2%E3%83%B3%E3%82%AB%E3%83%BC%E3%83%89dpt-%E3%82%AE%E3%83%95%E3%83%88%E3%83%9C%E3%83%83%E3%82%AF%E3%82%B9-';
  const BSD = 'b-%E3%83%90%E3%83%88%E3%83%AB%E3%82%B9%E3%82%BF%E3%83%BC%E3%83%88%E3%83%87%E3%83%83%E3%82%AD-';
  const STARTER = '-%E6%A7%8B%E7%AF%89%E6%B8%88%E3%81%BF%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%BF%E3%83%BC-';
  const DECK = '-%E6%A7%8B%E7%AF%89%E6%B8%88%E3%81%BF%E3%83%87%E3%83%83%E3%82%AD-';
  const MOVIEVS = '-%E6%98%A0%E7%94%BB%E5%85%AC%E9%96%8B%E8%A8%98%E5%BF%B5vs%E3%83%91%E3%83%83%E3%82%AF';
  const HOLON = '-%E3%83%9B%E3%83%AD%E3%83%B3%E3%81%AE%E7%A0%94%E7%A9%B6%E5%A1%94%E3%83%8F%E3%83%BC%E3%83%95%E3%83%87%E3%83%83%E3%82%AD1-2';
  const ENTRY = '-%E3%82%A8%E3%83%B3%E3%83%88%E3%83%AA%E3%83%BC%E3%83%91%E3%83%83%E3%82%AF-';
  const SP = '-%E5%AF%BE%E6%88%A6%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%BF%E3%83%BC%E3%83%91%E3%83%83%E3%82%AFsp-';
  const VSPACK = '-%E5%AF%BE%E6%88%A6%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%BF%E3%83%BC%E3%83%91%E3%83%83%E3%82%AF-';
  const STD = '-%E6%A7%8B%E7%AF%89%E3%82%B9%E3%82%BF%E3%83%B3%E3%83%80%E3%83%BC%E3%83%89%E3%83%87%E3%83%83%E3%82%AD-';
  const COLPACK = '-%E3%82%B3%E3%83%AC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3%E3%83%91%E3%83%83%E3%82%AF-';
  const MKIT = '%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%AD%E3%83%83%E3%83%88-';
  const GIFT = '%E3%82%AE%E3%83%95%E3%83%88%E3%83%9C%E3%83%83%E3%82%AF%E3%82%B9';

  const TC_ERAS = [
    {
      key: 'old', label: 'Old back',
      handles: [
        'expansionpacknorarity', '1st1', 'jungle', 'fossil', 'team-rocket', 'gymheroes', 'gymchallenge',
        'neo1', 'neo2', 'neo%E7%AC%AC3%E5%BC%BE-%E3%82%81%E3%81%96%E3%82%81%E3%82%8B%E4%BC%9D%E8%AA%AC-neo-revelation', 'neo4',
        '1stb-%E7%AC%AC1%E5%BC%BE-%E9%9D%92%E7%89%88', '1str-%E7%AC%AC2%E5%BC%BE-%E8%B5%A4%E7%89%88', '1stg-%E7%AC%AC3%E5%BC%BE-%E7%B7%91%E7%89%88',
        'quickstartergiftset', 'pewtercitygym', 'ceruleancitygym', 'vermilioncitygym', 'celadoncitygym', 'saffroncitygym', 'cinnabarcitygym',
        'intropack', 'neointropackneo', 'southernislands', 'premiumfile', 'promo',
      ],
    },
    {
      key: 'e', label: 'VS / web / e',
      handles: ['vs', 'web', 'e1', 'e2', 'e3', 'e4', 'e5', 'starterpack', 'minimumpack', 'theater-limited-vs-pack', 'e-promo'],
    },
    {
      key: 'adv', label: 'ADV / PCG',
      handles: [
        'players-club-promo-trainers-magazine-promo', 'pcg-promo', 'adv-pcg-%E3%83%97%E3%83%AD%E3%83%A2',
        'adv-%E7%AC%AC1%E5%BC%BE%E6%8B%A1%E5%BC%B5%E3%83%91%E3%83%83%E3%82%AF',
        '%E7%AC%AC2%E5%BC%BE-%E7%A0%82%E6%BC%A0%E3%81%AE%E3%81%8D%E3%81%9B%E3%81%8D',
        'adv%E7%AC%AC3%E5%BC%BE-%E5%A4%A9%E7%A9%BA%E3%81%AE%E8%A6%87%E8%80%85',
        '%E5%BC%B7%E5%8C%96%E6%8B%A1%E5%BC%B5%E3%83%91%E3%83%83%E3%82%AFex1-%E3%83%9E%E3%82%B0%E3%83%9Evs%E3%82%A2%E3%82%AF%E3%82%A2-%E3%81%B5%E3%81%9F%E3%81%A4%E3%81%AE%E9%87%8E%E6%9C%9B',
        'adv%E7%AC%AC2%E5%BC%BE-%E7%A0%82%E6%BC%A0%E3%81%AE%E3%81%8D%E3%81%9B%E3%81%8D-%E3%82%B3%E3%83%94%E3%83%BC',
        'advk' + STARTER + '%E3%82%AD%E3%83%A2%E3%83%AA',
        'adva' + STARTER + '%E3%82%A2%E3%83%81%E3%83%A3%E3%83%A2',
        'advm' + STARTER + '%E3%83%9F%E3%82%BA%E3%82%B4%E3%83%AD%E3%82%A6',
        'advf' + STARTER + '%E3%83%95%E3%83%A9%E3%82%A4%E3%82%B4%E3%83%B3%E3%83%87%E3%83%83%E3%82%AD',
        'advb' + STARTER + '%E3%83%9C%E3%83%BC%E3%83%9E%E3%83%B3%E3%83%80%E3%83%87%E3%83%83%E3%82%AD',
        'advmt' + STARTER + '%E3%83%A1%E3%82%BF%E3%82%B0%E3%83%AD%E3%82%B9%E3%83%87%E3%83%83%E3%82%AD',
        'adva' + DECK + '%E3%82%A2%E3%82%AF%E3%82%A2%E5%9B%A3%E3%83%8F%E3%83%BC%E3%83%95%E3%83%87%E3%83%83%E3%82%ADw',
        'advm' + DECK + '%E3%83%9E%E3%82%B0%E3%83%9E%E5%9B%A3%E3%83%8F%E3%83%BC%E3%83%95%E3%83%87%E3%83%83%E3%82%ADw',
        'advs' + MOVIEVS,
        'pcg1-%E4%BC%9D%E8%AA%AC%E3%81%AE%E9%A3%9B%E7%BF%94',
        'pcg2-%E8%92%BC%E7%A9%BA%E3%81%AE%E6%BF%80%E7%AA%81',
        'pcg3-%E3%83%AD%E3%82%B1%E3%83%83%E3%83%88%E5%9B%A3%E3%81%AE%E9%80%86%E8%A5%B2',
        'pcg4-%E9%87%91%E3%81%AE%E7%A9%BA-%E9%8A%80%E3%81%AE%E6%B5%B7',
        'pcg5-%E3%81%BE%E3%81%BC%E3%82%8D%E3%81%97%E3%81%AE%E6%A3%AE',
        'pcg6-%E3%83%9B%E3%83%AD%E3%83%B3%E3%81%AE%E7%A0%94%E7%A9%B6%E5%A1%94',
        'pcg7-%E3%83%9B%E3%83%AD%E3%83%B3%E3%81%AE%E5%B9%BB%E5%BD%B1',
        'pcg8-%E3%81%8D%E3%81%9B%E3%81%8D%E3%81%AE%E7%B5%90%E6%99%B6',
        'pcg9-%E3%81%95%E3%81%84%E3%81%AF%E3%81%A6%E3%81%AE%E6%94%BB%E9%98%B2',
        'pcgfrk-%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E6%A7%8B%E7%AF%89%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%BF%E3%83%BC-%E3%83%95%E3%82%B7%E3%82%AE%E3%83%90%E3%83%8A-%E3%83%AA%E3%82%B6%E3%83%BC%E3%83%89%E3%83%B3-%E3%82%AB%E3%83%A1%E3%83%83%E3%82%AF%E3%82%B9',
        'pcgd' + STARTER + '%E3%83%87%E3%82%AA%E3%82%AD%E3%82%B7%E3%82%B9%E3%83%87%E3%83%83%E3%82%AD',
        'pcgl' + STARTER + '%E3%83%AC%E3%83%83%E3%82%AF%E3%82%A6%E3%82%B6%E3%83%87%E3%83%83%E3%82%AD',
        'rhwb' + DECK + '%E3%83%AD%E3%82%B1%E3%83%83%E3%83%88%E5%9B%A3%E3%83%8F%E3%83%BC%E3%83%95%E3%83%87%E3%83%83%E3%82%ADw-black',
        'rhws' + DECK + '%E3%83%AD%E3%82%B1%E3%83%83%E3%83%88%E5%9B%A3%E3%83%8F%E3%83%BC%E3%83%95%E3%83%87%E3%83%83%E3%82%ADw-silber',
        'pcgm' + STARTER + '%E3%83%A1%E3%82%AC%E3%83%8B%E3%82%A6%E3%83%A0ex-%E8%8D%89',
        'pcgo' + STARTER + '%E3%82%AA%E3%83%BC%E3%83%80%E3%82%A4%E3%83%ABex-%E6%B0%B4',
        'pcgb' + STARTER + '%E3%83%90%E3%82%AF%E3%83%95%E3%83%BC%E3%83%B3ex-%E7%82%8E',
        'pcg5-a' + STARTER + '%E3%81%BE%E3%81%BC%E3%82%8D%E3%81%97%E3%81%AE%E3%83%9F%E3%83%A5%E3%82%A6',
        'pcg-f' + HOLON + '%E7%82%8Eex',
        'pcg-w' + HOLON + '%E6%B0%B4ex',
        'pcg-s' + HOLON + '%E9%9B%B7',
        'pcg-g' + STARTER + '%E5%A4%A7%E5%9C%B0%E3%81%AE%E3%82%B0%E3%83%A9%E3%83%BC%E3%83%89%E3%83%B3ex',
        'pcg-k' + STARTER + '%E5%A4%A7%E6%B5%B7%E3%81%AE%E3%82%AB%E3%82%A4%E3%82%AA%E3%83%BC%E3%82%ACex',
        'pcg-s' + DECK + '%E5%B0%81%E5%8D%B0-%E3%82%B5%E3%83%BC%E3%83%8A%E3%82%A4%E3%83%88ex',
        'pcg-b' + DECK + '%E9%9B%B7%E9%9C%87-%E3%83%90%E3%83%B3%E3%82%AE%E3%83%A9%E3%82%B9ex',
        'pcg_deo' + MOVIEVS + '-%E8%A3%82%E7%A9%BA%E3%81%AE%E3%83%87%E3%82%AA%E3%82%AD%E3%82%B7%E3%82%B9',
        'pcg_luc' + MOVIEVS + '-%E6%B3%A2%E5%B0%8E%E3%81%AE%E3%83%AB%E3%82%AB%E3%83%AA%E3%82%AA',
        'pcg_man' + MOVIEVS + '-%E8%92%BC%E6%B5%B7%E3%83%9E%E3%83%8A%E3%83%95%E3%82%A3',
        'pcg_pkp_for-%E3%83%9D%E3%82%B1%E3%83%91%E3%83%BC%E3%82%AF%E3%83%97%E3%83%AC%E3%83%9F%E3%82%A2%E3%83%A0%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB-%E3%83%95%E3%82%A9%E3%83%AC%E3%82%B9%E3%83%88%E3%82%B7%E3%83%BC%E3%83%88',
        'pkp-%E3%83%9D%E3%82%B1%E3%83%91%E3%83%BC%E3%82%AF%E3%83%97%E3%83%AC%E3%83%9F%E3%82%A2%E3%83%A0%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB',
        'wcp-%E3%83%AF%E3%83%BC%E3%83%AB%E3%83%89%E3%83%81%E3%83%A3%E3%83%B3%E3%83%94%E3%82%AA%E3%83%B3%E3%82%BA%E3%83%91%E3%83%83%E3%82%AF',
        QCP.replace('K', 'g') + '%E8%8D%89', QCP.replace('K', 'f') + '%E7%82%8E', QCP.replace('K', 'w') + '%E6%B0%B4',
        QCP.replace('K', 't') + '%E9%9B%B7', QCP.replace('K', 'p') + '%E8%B6%85', QCP.replace('K', 'fi') + '%E9%97%98',
        'gftr-' + GIFT,
        'adv_gft_os-' + GIFT + 'adv-%E3%83%A9%E3%83%86%E3%82%A3%E3%82%AA%E3%82%B9%E3%83%87%E3%83%83%E3%82%AD',
        'gifte-' + GIFT + '-%E3%82%A8%E3%83%A1%E3%83%A9%E3%83%AB%E3%83%89ver',
        'pcg_gftem_k-' + GIFT + '-%E3%82%A8%E3%83%A1%E3%83%A9%E3%83%AB%E3%83%89-%E3%82%AB%E3%82%A4%E3%82%AA%E3%83%BC%E3%82%AC%E3%83%87%E3%83%83%E3%82%AD',
        'gftmr-' + GIFT + '-%E3%83%9F%E3%83%A5%E3%82%A6-%E3%83%AB%E3%82%AB%E3%83%AA%E3%82%AAver',
        'pcg_gft_cra-%E3%82%B7%E3%82%B6%E3%83%AA%E3%82%AC%E3%83%BCex%E3%83%87%E3%83%83%E3%82%AD',
        'pcg_gft_mew-%E3%83%9F%E3%83%A5%E3%82%A6ex-%E3%83%87%E3%83%83%E3%82%AD',
        'pcg_gft_mig-%E3%82%B0%E3%83%A9%E3%82%A8%E3%83%8Aex%E3%83%87%E3%83%83%E3%82%AD',
        'pcg_gft_luc-%E4%BC%9D%E6%89%BF%E3%81%AE%E3%83%AB%E3%82%AB%E3%83%AA%E3%82%AAex%E3%83%87%E3%83%83%E3%82%AD',
        MKIT + '%E3%83%95%E3%82%B7%E3%82%AE%E3%83%80%E3%83%8D%E3%83%87%E3%83%83%E3%82%AD-pcg_mst_bul',
        MKIT + '%E3%82%A2%E3%83%81%E3%83%A3%E3%83%A2%E3%83%87%E3%83%83%E3%82%AD-pcg_mst_tor',
        MKIT + '%E3%82%B5%E3%82%A4%E3%83%89%E3%83%9C%E3%83%BC%E3%83%89-pcg_mst_sid',
      ],
    },
    {
      key: 'dp', label: 'DP / DPt',
      handles: [
        'dp-%E3%83%97%E3%83%AD%E3%83%A2',
        '%E4%B9%B1-%E4%B9%B1%E6%88%A6-%E3%83%9D%E3%82%B1%E3%83%A2%E3%83%B3%E3%82%B9%E3%82%AF%E3%83%A9%E3%83%B3%E3%83%96%E3%83%AB-%E3%83%9D%E3%82%B1%E3%83%A2%E3%83%B3%E3%82%AB%E3%83%BC%E3%83%89%E3%82%B2%E3%83%BC%E3%83%A0',
        'dp6-%E7%A0%B4%E7%A9%BA%E3%81%AE%E6%BF%80%E9%97%98',
        'dp5-%E7%A7%98%E5%A2%83%E3%81%AE%E5%8F%AB%E3%81%B3',
        'dp5-%E6%80%92%E3%82%8A%E3%81%AE%E7%A5%9E%E6%AE%BF',
        'dp4-%E6%9C%88%E5%85%89%E3%81%AE%E8%BF%BD%E8%B7%A1',
        'dp4-%E5%A4%9C%E6%98%8E%E3%81%91%E3%81%AE%E7%96%BE%E8%B5%B0',
        'dp3-%E3%81%B2%E3%81%8B%E3%82%8B%E9%97%87',
        'dp2-%E6%B9%96%E3%81%AE%E7%A7%98%E5%AF%86',
        'dp1-%E6%99%82%E7%A9%BA%E3%81%AE%E5%89%B5%E9%80%A0',
        'dpd-%E3%83%87%E3%82%A3%E3%82%A2%E3%83%AB%E3%82%AC%E3%83%87%E3%83%83%E3%82%AD',
        'dpg-%E3%82%AE%E3%83%A9%E3%83%86%E3%82%A3%E3%83%8A%E3%83%87%E3%83%83%E3%82%AD',
        'dp5' + VSPACK + '%E3%83%92%E3%83%BC%E3%83%89%E3%83%A9%E3%83%B3vs%E3%83%AC%E3%82%B8%E3%82%AE%E3%82%AC%E3%82%B9',
        'dpep08_%E3%82%A8%E3%83%B3%E3%83%88%E3%83%AA%E3%83%BC%E3%83%91%E3%83%83%E3%82%AF-08dx',
        'dp4' + VSPACK + '%E3%83%96%E3%83%BC%E3%83%90%E3%83%BC%E3%83%B3vs%E3%82%A8%E3%83%AC%E3%82%AD%E3%83%96%E3%83%AB',
        'dp3' + STD + '%E3%83%87%E3%82%A3%E3%82%A2%E3%83%AB%E3%82%AClv-x',
        'dp2-%E6%A7%8B%E7%AF%89%E3%83%8F%E3%83%BC%E3%83%95%E3%83%87%E3%83%83%E3%82%AD-%E6%94%BB%E3%82%81%E3%81%AE%E3%83%A9%E3%83%A0%E3%83%91%E3%83%AB%E3%83%89-%E5%AE%88%E3%82%8A%E3%81%AE%E3%83%88%E3%83%AA%E3%83%87%E3%83%97%E3%82%B9',
        'dp1ep_%E3%82%A8%E3%83%B3%E3%83%88%E3%83%AA%E3%83%BC%E3%83%91%E3%83%83%E3%82%AFdp',
        'pt4-%E3%82%A2%E3%83%AB%E3%82%BB%E3%82%A6%E3%82%B9%E5%85%89%E8%87%A8',
        'pt3-%E3%83%95%E3%83%AD%E3%83%B3%E3%83%86%E3%82%A3%E3%82%A2%E3%81%AE%E9%BC%93%E5%8B%95',
        'pt2-%E6%99%82%E3%81%AE%E6%9E%9C%E3%81%A6%E3%81%AE%E7%B5%86',
        'pt1-%E3%82%AE%E3%83%B3%E3%82%AC%E3%81%AE%E8%A6%87%E9%81%93',
        'pteg' + ENTRY + '%E3%82%AE%E3%83%A9%E3%83%86%E3%82%A3%E3%83%8A',
        'pted' + ENTRY + '%E3%83%87%E3%82%A3%E3%82%A2%E3%83%AB%E3%82%AC',
        'ptep' + ENTRY + '%E3%83%91%E3%83%AB%E3%82%AD%E3%82%A2',
        'pt' + SP + '%E3%82%B4%E3%82%A6%E3%82%AB%E3%82%B6%E3%83%ABvs%E3%82%A8%E3%83%AB%E3%83%AC%E3%82%A4%E3%83%89',
        'ptse' + SP + '%E3%82%B4%E3%82%A6%E3%82%AB%E3%82%B6%E3%83%ABvs%E3%82%A8%E3%83%AB%E3%83%AC%E3%82%A4%E3%83%89-%E3%82%A8%E3%83%AB%E3%83%AC%E3%82%A4%E3%83%89%E3%83%87%E3%83%83%E3%82%AD',
        'pt' + SP + '%E3%82%AC%E3%83%96%E3%83%AA%E3%82%A2%E3%82%B9vs%E3%83%AA%E3%82%B6%E3%83%BC%E3%83%89%E3%83%B3',
        'ptsr' + SP + '%E3%82%AC%E3%83%96%E3%83%AA%E3%82%A2%E3%82%B9vs%E3%83%AA%E3%82%B6%E3%83%BC%E3%83%89%E3%83%B3-%E3%83%AA%E3%82%B6%E3%83%BC%E3%83%89%E3%83%B3%E3%83%87%E3%83%83%E3%82%AD',
        'pt' + STD + '%E3%82%A2%E3%83%AB%E3%82%BB%E3%82%A6%E3%82%B9lv-x-%E8%8D%89-%E7%82%8E',
        'pt' + STD + '%E3%82%A2%E3%83%AB%E3%82%BB%E3%82%A6%E3%82%B9lv-x-%E9%9B%B7-%E8%B6%85',
        'ptgftn' + PTGFT + '%E3%83%8A%E3%82%A8%E3%83%88%E3%83%AB%E3%83%87%E3%83%83%E3%82%AD',
        'ptgfth' + PTGFT + '%E3%83%92%E3%82%B3%E3%82%B6%E3%83%AB%E3%83%87%E3%83%83%E3%82%AD',
        'ptgftp' + PTGFT + '%E3%83%9D%E3%83%83%E3%83%81%E3%83%A3%E3%83%9E%E3%83%87%E3%83%83%E3%82%AD',
        'ptgftpk' + PTGFT + '%E3%83%94%E3%82%AB%E3%83%81%E3%83%A5%E3%82%A6%E3%83%87%E3%83%83%E3%82%AD',
        'pts' + COLPACK + '%E3%82%B7%E3%82%A7%E3%82%A4%E3%83%9Flv-x',
        'ptm' + COLPACK + '%E3%83%9F%E3%83%A5%E3%82%A6%E3%83%84%E3%83%BClv-x',
        'ptr' + COLPACK + '%E3%83%AC%E3%82%B8%E3%82%AE%E3%82%AC%E3%82%B9lv-x',
        '%E6%98%A0%E7%94%BB10%E5%91%A8%E5%B9%B4%E8%A8%98%E5%BF%B5%E3%83%97%E3%83%AC%E3%83%9F%E3%82%A2%E3%83%A0%E3%82%B7%E3%83%BC%E3%83%88',
        '%E6%98%A0%E7%94%BB%E5%85%AC%E9%96%8B%E8%A8%98%E5%BF%B5-%E3%83%97%E3%83%AC%E3%83%9F%E3%82%A2%E3%83%A0%E3%82%B7%E3%83%BC%E3%83%882008',
        'm-%E6%98%A0%E7%94%BB%E5%85%AC%E9%96%8B%E8%A8%98%E5%BF%B5-%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E3%83%91%E3%83%83%E3%82%AF2009',
      ],
    },
    {
      key: 'legend', label: 'LEGEND (HGSS)',
      handles: [
        'legend-%E3%83%97%E3%83%AD%E3%83%A2',
        'l1-%E3%83%8F%E3%83%BC%E3%83%88%E3%82%B4%E3%83%BC%E3%83%AB%E3%83%89%E3%82%B3%E3%83%AC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3',
        'l1-%E3%82%BD%E3%82%A6%E3%83%AB%E3%82%B7%E3%83%AB%E3%83%90%E3%83%BC%E3%82%B3%E3%83%AC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3',
        'l2-%E3%82%88%E3%81%BF%E3%81%8C%E3%81%88%E3%82%8B%E4%BC%9D%E8%AA%AC',
        'l3-%E9%A0%82%E4%B8%8A%E5%A4%A7%E6%BF%80%E7%AA%81',
        'll-%E3%83%AD%E3%82%B9%E3%83%88%E3%83%AA%E3%83%B3%E3%82%AF',
        'l2' + STD + '%E3%83%90%E3%83%B3%E3%82%AE%E3%83%A9%E3%82%B9%E6%82%AA',
        'l2' + STD + '%E3%83%8F%E3%82%AC%E3%83%8D%E3%83%BC%E3%83%AB%E9%8B%BC',
        'e-%E3%82%A8%E3%82%AD%E3%82%B9%E3%83%91%E3%83%BC%E3%83%88%E3%83%87%E3%83%83%E3%82%AD-%E3%83%AA%E3%83%BC%E3%83%95%E3%82%A3%E3%82%A2vs%E3%83%A1%E3%82%BF%E3%82%B0%E3%83%AD%E3%82%B9-online',
        BSD + '%E3%83%89%E3%83%80%E3%82%A4%E3%83%88%E3%82%B9',
        BSD + '%E3%83%96%E3%83%BC%E3%83%90%E3%83%BC%E3%83%B3',
        BSD + '%E3%82%AB%E3%83%A1%E3%83%83%E3%82%AF%E3%82%B9',
        BSD + '%E3%83%A9%E3%82%A4%E3%83%81%E3%83%A5%E3%82%A6',
        'pw-%E3%83%9D%E3%82%B1%E3%83%A2%E3%83%B3%E3%82%AB%E3%83%BC%E3%83%89%E3%82%B2%E3%83%BC%E3%83%A0-%E3%83%94%E3%82%AB%E3%83%81%E3%83%A5%E3%82%A6-%E3%83%AF%E3%83%BC%E3%83%AB%E3%83%89',
      ],
    },
  ];

  // Returns 'A', 'A-', 'B+', ... or null. Handles "【状態A-】", "状態A", full-width letters and bare "A-".
  function detectCond(text) {
    if (!text) return null;
    const s = String(text).normalize('NFKC');
    let m = s.match(/状態\s*([A-D])\s*([-+−‐])?/);
    if (!m) m = s.trim().match(/^[【\[(]?\s*([A-D])\s*([-+−‐])?\s*[】\])]?$/);
    if (!m) return null;
    const sign = m[2] ? (m[2] === '+' ? '+' : '-') : '';
    return m[1] + sign;
  }

  // Condition for one variant: the variant's own fields win, then the product title, then tags.
  function variantCond(p, v) {
    const own = [v.title, v.option1, v.option2, v.option3].map(detectCond).find(Boolean);
    if (own) return own;
    const tags = Array.isArray(p.tags) ? p.tags.join(' ') : p.tags;
    return detectCond(p.title) || detectCond(tags);
  }

  function setName(handle) {
    try { return decodeURIComponent(handle).replace(/[-_]+/g, ' '); } catch (e) { return handle; }
  }
  
  // ---------- Card Rush: parsing and classification ----------
  const CR_ERAS = [
    { key: 'old', label: 'Old back' },
    { key: 'e', label: 'VS / web / e' },
    { key: 'adv', label: 'ADV / PCG' },
    { key: 'dp', label: 'DP / DPt' },
    { key: 'legend', label: 'LEGEND (HGSS)' },
    { key: 'pre', label: 'Other pre-BW' },
    { key: 'misc', label: 'Unsorted' },
    { key: 'later', label: 'BW or later, foreign', off: true },
  ];
  // Card Rush files every pre-XY single under a type category with the pack tag [その他] or [旧裏].
  const CR_SOURCES = [
    ['/product-group/532', '旧裏 feature'], ['/product-list/3', '草'], ['/product-list/2', '炎'], ['/product-list/5', '水'],
    ['/product-list/4', '雷'], ['/product-list/9', '超'], ['/product-list/7', '闘'], ['/product-list/16', '悪'],
    ['/product-list/10', '鋼'], ['/product-list/8', '妖'], ['/product-list/6', '竜'], ['/product-list/11', '無'],
    ['/product-list/27', 'その他'],
  ];

  // Splits listing text such as "ピカチュウ【P】{113/DP-P} [その他] 54,800円(税込) 在庫数 10枚".
  function crParse(text) {
    const s = String(text).replace(/\s+/g, ' ').trim();
    const pm = s.match(/([\d,]+)\s*円/);
    if (!pm) return null;
    let before = s.slice(0, pm.index).trim();
    let tag = '';
    if (before.endsWith(']')) {
      let depth = 0, i = before.length - 1;
      for (; i >= 0; i--) { if (before[i] === ']') depth++; else if (before[i] === '[' && --depth === 0) break; }
      if (i >= 0) { tag = before.slice(i + 1, -1).trim(); before = before.slice(0, i).trim(); }
    }
    const half = (before.length - 1) / 2;   // the name is printed twice when the image alt text is included
    if (Number.isInteger(half) && before.slice(0, half) === before.slice(half + 1)) before = before.slice(0, half);
    const qm = s.slice(pm.index).match(/在庫数\s*([\d,]+)/);
    return { name: before, tag, price: Number(pm[1].replace(/,/g, '')), qty: qm ? Number(qm[1].replace(/,/g, '')) : 0 };
  }

  // Card Rush only labels a listing when it is below top condition, so no prefix means A.
  function crCond(name) {
    const n = name.replace(/^☆SALE☆/, '').trim();
    if (/^〔状態A-〕/.test(n)) return 'A-';
    if (/^[〔《]/.test(n)) return 'other';
    return 'A';
  }

  function crEra(name, tag) {
    if (tag === '旧裏' || /\{旧裏\}/.test(name)) return 'old';
    if (/英語版|中国語版|韓国語版|タイ語版|インドネシア語版|海外版/.test(name)) return 'later';
    const code = (name.match(/\{([^}]*)\}/) || [])[1] || '';
    const rarity = (name.match(/【([^】]*)】/) || [])[1] || '';
    if (/ADV-P|PCG-P|PLAY|\/T$/.test(code)) return 'adv';
    if (/DPt?-P|DPBP/.test(code)) return 'dp';
    if (/L-P/.test(code)) return 'legend';
    if (/(BW|XY|SM|S|SV|M|30th)-P|SWSH|^TG/.test(code)) return 'later';
    if (/[（(](カードe|web|VS)[)）\/]/.test(name)) return 'e';
    if (/δ|デルタ種/.test(name)) return 'adv';
    if (/グレート|LEGEND/.test(name)) return 'legend';
    if (/L[Vv]\.?\s*(X|\d+)/.test(name)) return 'dp';
    if (/EX|GX|VMAX|VSTAR|BREAK|仕様|メガ.*ex|V【/.test(name)) return 'later';
    if (/^[A-Za-z]+$/.test(rarity)) return 'later';
    if (/[ァ-ヶー]ex/.test(name)) return 'adv';
    if (/^[●◆★☆]/.test(rarity)) return 'pre';
    return 'misc';
  }

  // ---------- Hareruya 2: whole-era collections, condition in the product title ----------
  const H2_ERAS = [
    { key: 'old', label: 'Old back', handles: ['pmcg', 'neo'] },
    { key: 'e', label: 'VS / web / e', handles: ['45', '46', '47', 'e'] },
    { key: 'adv', label: 'ADV / PCG', handles: ['adv', 'pcg'] },
    { key: 'dp', label: 'DP / DPt', handles: ['dp', 'dpt'] },
    { key: 'legend', label: 'LEGEND (HGSS)', handles: ['legend'] },
  ];
  // Hareruya 2 leaves its best stock unmarked and uses 【状態A】 for the next step down.
  function h2Cond(p) {
    const t = String(p.title || '');
    if (!/\{[^}]*\}|〈[^〉]*〉/.test(t)) return null;      // packs, supplies and bundles carry no type or number
    const marked = detectCond(t);
    if (marked) return marked;
    if (/^\s*【/.test(t)) return 'other';                 // graded slabs and other bracketed specials
    return 'NM';
  }
  function h2Set(p) {
    const m = String(p.title || '').match(/\[([^\]]+)\](?:#\d+)?\s*$/);
    return m ? m[1] : '';
  }
  /* </core> */

const DIR = process.env.SHOP_WATCH_DIR ? path.resolve(process.env.SHOP_WATCH_DIR) : path.join(path.dirname(fileURLToPath(import.meta.url)), 'shop-watch');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Sent with every request so the shops see an ordinary browser page load.
const HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'ja,en-GB;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'none', 'Sec-Fetch-User': '?1',
};

async function request(url) {
  for (let i = 0; i < 4; i++) {
    let r;
    try { r = await fetch(url, { headers: HEADERS, redirect: 'follow' }); }
    catch (e) { if (i === 3) throw e; await sleep(2000 * (i + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(2500 * (i + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  }
  throw new Error('rate limited');
}

async function pool(jobs, size, run) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < jobs.length) { await run(jobs[next++]); await sleep(300); }
  }));
}

// Every scan returns { items, okSources, failed }. A source is one collection or category, so a source that
// fails to load can be carried over from the last run instead of looking like everything in it sold out.
async function scanShopify(shop) {
  const items = [], ok = [], failed = [];
  const jobs = shop.sets.flatMap((e) => e.handles.map((h) => ({ era: e.key, handle: h })));
  await pool(jobs, 3, async (job) => {
    const found = [];
    try {
      for (let page = 1; page <= 200; page++) {
        const data = await (await request(shop.base + '/collections/' + job.handle + '/products.json?limit=250&page=' + page)).json();
        const products = (data && data.products) || [];
        for (const p of products) for (const v of p.variants || []) {
          const cond = shop.cond(p, v);
          if (!shop.want.includes(cond) || !v.available) continue;
          const img = (v.featured_image && v.featured_image.src) || (p.images && p.images[0] && p.images[0].src) || '';
          found.push({
            key: shop.id + ':' + v.id, shop: shop.id, src: job.handle, name: p.title, cond, price: Math.round(Number(v.price) || 0),
            era: job.era, set: shop.setOf(p, job), img: img ? img + (img.includes('?') ? '&' : '?') + 'width=480' : '',
            url: shop.base + '/products/' + p.handle + '?variant=' + v.id,
          });
        }
        if (products.length < 250) break;
      }
      items.push(...found); ok.push(job.handle);
    } catch (e) { failed.push(setName(job.handle) + ' (' + e.message + ')'); }
  });
  return { items, okSources: ok, failed };
}

const untag = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');

function crReadHtml(html) {
  const out = [], seen = new Set();
  const re = /<a\b[^>]*href="[^"]*\/product\/(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    if (seen.has(m[1])) continue;
    const p = crParse(untag(m[2]));
    if (!p || !p.name) continue;
    seen.add(m[1]);
    const im = m[2].match(/<img\b[^>]*?(?:data-src|data-original)="([^"]+)"/) || m[2].match(/<img\b[^>]*?src="([^"]+)"/);
    out.push(Object.assign(p, { id: m[1], img: im ? im[1] : '' }));
  }
  return out;
}

async function scanCardRush(shop) {
  const items = [], ok = [], failed = [];
  await pool(CR_SOURCES, 2, async ([p, label]) => {
    const found = [];
    try {
      for (let page = 1; page <= 500; page++) {
        const html = await (await request(shop.base + p + '?page=' + page)).text();
        const rows = crReadHtml(html);
        const forced = p.includes('product-group/532');
        for (const r of rows) {
          if (!forced && r.tag !== '旧裏' && r.tag !== 'その他') continue;
          const cond = crCond(r.name);
          if ((cond !== 'A' && cond !== 'A-') || r.qty < 1) continue;
          found.push({
            key: 'cr:' + r.id, shop: 'cr', src: p, name: r.name.replace(/^☆SALE☆/, ''), cond, price: r.price,
            era: forced ? 'old' : crEra(r.name, r.tag), set: label, img: r.img, url: shop.base + '/product/' + r.id,
          });
        }
        if (!rows.length || !html.includes('page=' + (page + 1))) break;
        await sleep(300);
      }
      items.push(...found); ok.push(p);
    } catch (e) { failed.push(label + ' (' + e.message + ')'); }
  });
  return { items, okSources: ok, failed };
}

const SHOPS = {
  tc: { id: 'tc', title: 'Torecacamp', base: 'https://torecacamp-pokemon.com', scan: scanShopify, sets: TC_ERAS, want: ['A', 'A-'], cond: variantCond, setOf: (p, job) => setName(job.handle) },
  cr: { id: 'cr', title: 'Card Rush', base: 'https://www.cardrush-pokemon.jp', scan: scanCardRush },
  h2: { id: 'h2', title: 'Hareruya 2', base: 'https://www.hareruya2.com', scan: scanShopify, sets: H2_ERAS, want: ['NM', 'A'], cond: h2Cond, setOf: h2Set },
};
const ERA_LABEL = Object.fromEntries([...CR_ERAS, ...TC_ERAS].map((e) => [e.key, e.label]));

// ---------- compare with the previous run ----------
function compare(prev, scans, today) {
  const now = {}, added = [], gone = [], down = [], up = [];
  for (const [id, scan] of Object.entries(scans)) {
    const okSrc = new Set(scan.okSources);
    for (const it of scan.items) if (!now[it.key]) now[it.key] = it;
    // keep last run's listings for any source that could not be read today
    for (const old of Object.values(prev.items || {})) if (old.shop === id && !okSrc.has(old.src) && !now[old.key]) now[old.key] = Object.assign({}, old, { stale: true });
  }
  // shops that were not scanned at all this run are carried over untouched
  for (const old of Object.values(prev.items || {})) if (!scans[old.shop] && !now[old.key]) now[old.key] = old;

  const firstRunFor = (shop) => !(prev.shopsSeen || []).includes(shop);
  for (const it of Object.values(now)) {
    const old = (prev.items || {})[it.key];
    it.first = old ? old.first : today;
    if (!old) { if (!firstRunFor(it.shop)) added.push(it); continue; }
    if (it.price < old.price) down.push(Object.assign({}, it, { was: old.price }));
    else if (it.price > old.price) up.push(Object.assign({}, it, { was: old.price }));
  }
  for (const old of Object.values(prev.items || {})) if (!now[old.key]) gone.push(old);
  const shopsSeen = [...new Set([...(prev.shopsSeen || []), ...Object.keys(scans).filter((s) => scans[s].okSources.length)])];
  return { state: { at: today, items: now, shopsSeen }, added, gone, down, up };
}

// ---------- report ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yen = (n) => '¥' + Number(n).toLocaleString('en-GB');

function tile(it, kind) {
  const second = (it.shop === 'h2' && it.cond === 'A') || it.cond === 'A-';
  const price = it.was ? '<s>' + yen(it.was) + '</s> ' + yen(it.price) + ' <em class="' + kind + '">' + (it.price < it.was ? '−' : '+') + Math.round(Math.abs(it.price - it.was) / it.was * 100) + '%</em>' : yen(it.price);
  return '<a class="tile ' + kind + '" data-shop="' + it.shop + '" href="' + esc(it.url) + '" target="_blank" rel="noopener">' +
    '<span class="pic">' + (it.img ? '<img loading="lazy" alt="" src="' + esc(it.img) + '">' : '') + '</span>' +
    '<span class="cond' + (second ? ' minus' : '') + '">' + esc(it.cond) + '</span>' +
    '<span class="info"><span class="price">' + price + '</span>' +
    '<span class="meta">' + esc(SHOPS[it.shop].title) + ', ' + esc(ERA_LABEL[it.era] || it.era) + '</span>' +
    '<span class="name">' + esc(it.name) + '</span></span></a>';
}

function report(diff, scans, today, prevDate) {
  const sections = [
    ['added', 'New since last run', 'Listings that were not in stock last time.', [...diff.added].sort((a, b) => b.price - a.price)],
    ['down', 'Price drops', 'Same listing, cheaper than last time.', [...diff.down].sort((a, b) => (a.price / a.was) - (b.price / b.was))],
    ['gone', 'Gone since last run', 'Sold out or delisted. Prices shown are the last ones seen.', [...diff.gone].sort((a, b) => b.price - a.price)],
    ['up', 'Price rises', 'Same listing, dearer than last time.', [...diff.up].sort((a, b) => (b.price / b.was) - (a.price / a.was))],
  ];
  const total = Object.values(diff.state.items).length;
  const failed = Object.entries(scans).flatMap(([id, s]) => s.failed.map((f) => SHOPS[id].title + ': ' + f));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JusSlabs shop watch ${today}</title>
<style>
:root{--ink:#1d2433;--mute:#667085;--line:#d9dee7;--paper:#f6f7f9;--blue:#1f4fd8;--a:#0b7a53;--am:#a15c00;--bad:#b42318}
*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI","Hiragino Sans","Yu Gothic",sans-serif}
body{margin:0;background:var(--paper);color:var(--ink)}
header{background:#fff;border-bottom:1px solid var(--line);padding:18px 24px;position:sticky;top:0;z-index:2}
h1{font-size:20px;margin:0 0 4px} .sub{color:var(--mute);font-size:13px}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 12px;color:var(--mute);font-size:13px;cursor:pointer}
.chip[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}
.jump{font-size:13px;color:var(--blue);text-decoration:none;margin-left:6px}
main{padding:8px 24px 40px} section{margin-top:26px}
h2{font-size:17px;margin:0} h2 small{color:var(--mute);font-weight:500;margin-left:6px} section>p{margin:4px 0 0;color:var(--mute);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:14px}
.tile{position:relative;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;color:inherit;text-decoration:none}
.tile:focus-visible,.chip:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.pic{display:block;background:#eef0f4;aspect-ratio:63/88} .pic img{width:100%;height:100%;object-fit:contain;display:block}
.tile.gone .pic img{filter:grayscale(1);opacity:.6}
.cond{position:absolute;top:8px;right:8px;font-size:17px;padding:4px 10px;border-radius:7px;font-weight:800;color:#fff;background:var(--a)} .cond.minus{background:var(--am)}
.info{padding:10px 12px 12px;display:flex;flex-direction:column;gap:3px}
.price{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums} .price s{font-size:13px;font-weight:500;color:var(--mute)}
.price em{font-style:normal;font-size:13px} em.down{color:var(--a)} em.up{color:var(--bad)}
.meta,.name{font-size:12px;color:var(--mute)} .name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.empty,.warn{font-size:13px;color:var(--mute);margin-top:10px} .warn{color:var(--bad)}
</style></head><body>
<header><h1>Shop watch, ${today}</h1>
<div class="sub">${prevDate ? 'Compared with the run on ' + prevDate + '.' : 'First run: this is the baseline, so changes start showing from the next run.'} ${total.toLocaleString('en-GB')} top-condition listings in stock across ${Object.keys(scans).map((id) => SHOPS[id].title).join(', ')}.</div>
<div class="bar">${Object.keys(SHOPS).map((id) => '<button class="chip" data-shop="' + id + '" aria-pressed="true">' + SHOPS[id].title + '</button>').join('')}
${sections.map(([k, t, , rows]) => '<a class="jump" href="#' + k + '">' + t + ' (' + rows.length + ')</a>').join('')}</div></header>
<main>
${failed.length ? '<p class="warn">Could not read ' + failed.length + ' sources today, so their listings were carried over unchanged: ' + esc(failed.join(', ')) + '</p>' : ''}
${sections.map(([k, t, note, rows]) => '<section id="' + k + '"><h2>' + t + '<small>' + rows.length + '</small></h2><p>' + note + '</p>' +
    (rows.length ? '<div class="grid">' + rows.slice(0, 1500).map((r) => tile(r, k)).join('') + '</div>' : '<p class="empty">Nothing here this run.</p>') + '</section>').join('\n')}
</main>
<script>
document.querySelectorAll('.chip').forEach(function(c){c.addEventListener('click',function(){
  var on=c.getAttribute('aria-pressed')!=='true';c.setAttribute('aria-pressed',on);
  document.querySelectorAll('.tile[data-shop="'+c.dataset.shop+'"]').forEach(function(t){t.style.display=on?'':'none'});
});});
</script></body></html>`;
}

// ---------- run ----------
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const ids = only.length ? only.filter((id) => SHOPS[id]) : Object.keys(SHOPS);
fs.mkdirSync(path.join(DIR, 'reports'), { recursive: true });
const statePath = path.join(DIR, 'state.json');
const prev = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);

const scans = {};
for (const id of ids) {
  process.stdout.write('Scanning ' + SHOPS[id].title + '... ');
  const t = Date.now();
  scans[id] = await SHOPS[id].scan(SHOPS[id]);
  console.log(scans[id].items.length + ' listings, ' + scans[id].failed.length + ' sources failed, ' + Math.round((Date.now() - t) / 1000) + 's');
  if (scans[id].failed.length) console.log('  Failed: ' + scans[id].failed.slice(0, 4).join(', ') + (scans[id].failed.length > 4 ? ', and ' + (scans[id].failed.length - 4) + ' more' : ''));
}
const diff = compare(prev, scans, today);
const html = report(diff, scans, today, prev.at);
fs.writeFileSync(path.join(DIR, 'report.html'), html);
fs.writeFileSync(path.join(DIR, 'reports', today + '.html'), html);
fs.writeFileSync(statePath, JSON.stringify(diff.state));
console.log('New ' + diff.added.length + ', price drops ' + diff.down.length + ', gone ' + diff.gone.length + ', price rises ' + diff.up.length);
console.log('Report: ' + path.join(DIR, 'report.html'));
