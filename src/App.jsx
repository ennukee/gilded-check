import { useCallback, useEffect, useState } from 'react';
import './assets/css/App.css'
import { Box, Button, Input, TextField, Typography } from '@mui/material';

const TURBO_BOOST_TRACK_COST = 30;

function App() {
  const [armoryLink, setArmoryLink] = useState('');
  const [linkEndSlug, setLinkEndSlug] = useState('');
  const [currentGilded, setCurrentGilded] = useState(0);
  const [currentRuned, setCurrentRuned] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);

  const processPlayerData = useCallback((data) => {
    const gearData = data?.characterDetails?.itemDetails;
    if (!gearData) {
      console.error('No gear data found in request. Response dump is:', data);
      return;
    }
    /**
     * Relevant bonus IDS
     * - 10390 = Myth Track
     * - 10255 = Hero Track
     * - 12043 = 675 Crafted
     */

    const itemAnalysis = Object.values(gearData.items).reduce((acc, item) => {
      // Classify the item as hero track, myth track, or crafted.
      let classification = null;
      if (item.bonuses.includes(11996)) {
        classification = 'myth';
      } else if (item.bonuses.includes(10255)) {
        classification = 'hero';
      } else if (item.bonuses.includes(12043)) {
        classification = 'crafted';
      }

      if (!classification) {
        if (item.item_id === 228411) {
          console.log('Cyrce detected');
          acc.isUsingCyrce = true;
          return acc;
        }

        console.log('Item not classified:', item);
        return acc;
      }

      if (classification === 'myth') {
        // console.log('Processing myth track item @ ilvl', item.item_level);
        const ilvlToPotential = {
          662: 75 + TURBO_BOOST_TRACK_COST,
          665: 60 + TURBO_BOOST_TRACK_COST,
          668: 45 + TURBO_BOOST_TRACK_COST,
          671: 30 + TURBO_BOOST_TRACK_COST,
          675: 15 + TURBO_BOOST_TRACK_COST,
          678: 0  + TURBO_BOOST_TRACK_COST,
        }
        if (!ilvlToPotential[item.item_level]) {
          console.error('Unknown value for myth track item:', item.item_level);
          return acc;
        }

        acc.mythTrackItems += 1;
        acc.gildedNeeded += ilvlToPotential[item.item_level];
      }
      else if (classification === 'hero') {
        // console.log('Processing hero track item @ ilvl', item.item_level);


        const ilvlToPotential = {
          658: 30 + TURBO_BOOST_TRACK_COST,
          662: 15 + TURBO_BOOST_TRACK_COST,
          665: 0 + TURBO_BOOST_TRACK_COST,
        }
        if (!ilvlToPotential[item.item_level]) {
          console.error('Unknown value for hero track item:', item.item_level);
          return acc;
        }

        acc.heroTrackItems += 1;
        acc.gildedNeeded += ilvlToPotential[item.item_level];
      }
      else if (classification === 'crafted') {
        // console.log('Processing crafted item @ ilvl', item.item_level);
        acc.craftedItems += 1;
        acc.gildedNeeded += TURBO_BOOST_TRACK_COST;
      }

      return acc;
    }, {
      heroTrackItems: 0,
      mythTrackItems: 0,
      craftedItems: 0,
      gildedNeeded: 0,
      isUsingCyrce: false,
      data: gearData.items,
    })

    const analysisAfterExistingValues = {
      ...itemAnalysis,
      gildedNeeded: itemAnalysis.gildedNeeded - (parseInt(currentGilded) || 0) - (parseInt(Math.floor(currentRuned / 45) * 15) || 0),
    }

    setAnalysisData(analysisAfterExistingValues);
  }, [currentGilded, currentRuned]);

  const fetchPlayerData = useCallback(async (region, realm, username) => {
    const response = await fetch(`https://corsproxy.io/?url=https://raider.io/api/characters/${region}/${realm}/${username}?season=season-tww-2&tier=33`);
    if (!response.ok) {
      throw new Error('Failed to fetch player data');
    }
    const data = await response.json();
    processPlayerData(data);
  }, [processPlayerData])

  const handleFetchDataClick = useCallback(async () => {
    // RaiderIO example: https://raider.io/characters/us/icecrown/Chickenism
    // WoW Armory example: https://worldofwarcraft.blizzard.com/en-us/character/us/wyrmrest-accord/Infimyst

    const splitLink = armoryLink.split('/');
    const [region, realm, username] = splitLink.slice(-3);
    setLinkEndSlug(splitLink.slice(-3).join('/'));
    fetchPlayerData(region, realm, username);
  }, [armoryLink, fetchPlayerData]);

  useEffect(() => {
    if (isNaN(+currentGilded) || isNaN(+currentRuned)) {
      setError('Either current gilded or runed values is not a number. Please check your input.');
      return;
    }
    setError(null);
  }, [currentGilded, currentRuned]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100%',
      color: 'white'
    }}>
      <Typography variant="h4" gutterBottom>
        WoW Turbo Boost Gilded Check
      </Typography>
      <Typography variant="body2" gutterBottom>
        Enter a link your WoW armory / Raider.IO profile, and also your <b>potential</b> Gilded and Runed amounts for <b>pre-May 13th</b>.
      </Typography>
      <Typography variant="caption" gutterBottom align='center' maxWidth="800px" margin="10px">
        This tool has some technical limitations, so it may show slightly incorrect values if you wear 658 crafted or have Champion track items equipped. It is also based on your Raider.IO profile, even if you give a normal armory link, so make sure it is up to date with your best ilvl gear, even if it's not the best sim gear.
      </Typography>
      {error && <Typography color="red" variant="caption" gutterBottom align='center' maxWidth="800px" margin="10px">
        {error}
      </Typography>}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: '20px' }}>
        <TextField
          label="Armory or Raider.IO Link"
          variant="outlined"
          onChange={(e) => setArmoryLink(e.target.value)}
          value={armoryLink}
          size="small"
          sx={{ width: '300px' }}
        />
        <TextField
          label="Gilded Crests"
          variant="outlined"
          onChange={(e) => setCurrentGilded(e.target.value)}
          value={currentGilded}
          size="small"
          sx={{ width: '100px' }}
        />
        <TextField
          label="Runed Crests"
          variant="outlined"
          onChange={(e) => setCurrentRuned(e.target.value)}
          value={currentRuned}
          size="small"
          sx={{ width: '100px' }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleFetchDataClick()}
          sx={{ width: '150px' }}
        >
          Check
        </Button>
      </Box>
      {analysisData && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '20px',
          padding: '20px',
          width: '80%',
        }}>
          <Typography fontWeight="bold" variant="h4" marginTop="20px">
            Analysis Results
          </Typography>
          <Typography variant="caption" marginBottom="8px">
            <b>Note:</b> Does not account for any gilded you obtain during raid. Value as-is would be for grinders who want to max out before raid.
          </Typography>
          <Typography variant="body1" gutterBottom>
            {`With the gear currently equipped on your RaiderIO profile `}
            (<a href={`https://raider.io/characters/${linkEndSlug}`} target="_blank">seen here</a>)
            {` you will need `}<b>{analysisData.gildedNeeded}</b>{` Gilded to max out after the event starts.`}
          </Typography>
          <Typography variant="body1" gutterBottom>
            If you were to get Myth track in your current {analysisData.heroTrackItems} Hero track items, you would need an additional <b>{analysisData.heroTrackItems * 60}</b> Gilded.
          </Typography>
          <Typography variant="body1" gutterBottom>
            This would be a total of <b>{Math.ceil(analysisData.gildedNeeded / 16)}</b> M+10 runs (<b>{Math.ceil((analysisData.gildedNeeded + (analysisData.heroTrackItems * 60)) / 16)}</b> if all Myth track).
          </Typography>
          <Typography variant="body1" gutterBottom>
            Or if doing +12s, this would be a total of <b>{Math.ceil(analysisData.gildedNeeded / 20)}</b> M+12 runs (<b>{Math.ceil((analysisData.gildedNeeded + (analysisData.heroTrackItems * 60)) / 20)}</b> if all Myth track).
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default App
