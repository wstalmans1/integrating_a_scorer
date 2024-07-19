'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ChakraProvider, Button, Checkbox, Stack, Badge, SimpleGrid, Heading, Text } from '@chakra-ui/react'
 
const APIKEY = process.env.NEXT_PUBLIC_GC_API_KEY
const SCORERID = process.env.NEXT_PUBLIC_GC_SCORER_ID
 
// endpoint for submitting passport
const SUBMIT_PASSPORT_URI = 'https://api.scorer.gitcoin.co/registry/submit-passport'
// endpoint for getting the signing message
const SIGNING_MESSAGE_URI = 'https://api.scorer.gitcoin.co/registry/signing-message'
// score needed to see hidden message
const thresholdNumber = 20
const headers = APIKEY ? ({
  'Content-Type': 'application/json',
  'X-API-Key': APIKEY
}) : undefined
 
declare global {
  interface Window {
    ethereum?: any
  }
}


 
// define Stamp here
interface Stamp {
  id: number
  stamp: string
}

// define UserStruct here
interface UserStruct {
  id: number;
  address: string;
  score: number;
  stampProviders: Array<Stamp>;
}
 
export default function Passport() {
  // here we deal with any local state we need to manage
  const [address, setAddress] = useState<string>('')
  //const [userInfo, setUserInfo] = useState<Array<UserStruct>>([])
  const [userInfo, setUserInfo] = useState<Array<UserStruct>>([
    { id: 0, address: '0x3c9840c489bb3b95cbf7a449dba55ab022cf522c', score: 23, stampProviders: [{ id: 0, stamp: 'Github' }, { id: 1, stamp: 'Lens' }] },
    { id: 1, address: '0x49bbd0c489bb3b95cbf7a44955aa55b022c1fff5', score: 19, stampProviders: [{ id: 0, stamp: 'Github' }, { id: 1, stamp: 'Google' }] },
    { id: 2, address: '0x5b985cbf40c489b5cbf7ffa449dba55ab022c1fb', score: 15, stampProviders: [{ id: 0, stamp: 'Google' }, { id: 1, stamp: 'Twitter' }] },
    { id: 3, address: '0x6e9840c41ffb3b95cbf7adba9dba55ab01fff5a4', score: 28, stampProviders: [{ id: 0, stamp: 'Github' }, { id: 1, stamp: 'Lens' }] }])
  const [trustedUsers, setTrustedUsers] = useState<Array<UserStruct>>([])
  const [showTrusted, setShowTrusted] = useState<boolean>(false)
  const [showStamps, setShowStamps] = useState<boolean>(false)



 
  useEffect(() => {
    checkConnection()
    async function checkConnection() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        // if the user is connected, set their account and fetch their score
        if (accounts && accounts[0]) {
          setAddress(accounts[0].address)
          checkPassport(accounts[0].address)
        }
      } catch (err) {
        console.log('not connected...')
      }
    }
  }, [])
 
  async function connect() {
    console.log("in connect func")
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAddress(accounts[0])
      checkPassport(accounts[0])
    } catch (err) {
      console.log('error connecting...')
    }
  }
 
  async function getSigningMessage() {
    try {
      const response = await fetch(SIGNING_MESSAGE_URI, {
        headers
      })
      const json = await response.json()
      return json
    } catch (err) {
      console.log('error: ', err)
    }
  }
 
  async function submitPassport() {
    try {
      // call the API to get the signing message and the nonce
      const { message, nonce } = await getSigningMessage()
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      // ask the user to sign the message
      const signature = await signer.signMessage(message)
      // call the API, sending the signing message, the signature, and the nonce
      const response = await fetch(SUBMIT_PASSPORT_URI, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address,
          scorer_id: SCORERID,
          signature,
          nonce
        })
      })
 
      const data = await response.json()
      console.log('data:', data)
    } catch (err) {
      console.log('error: ', err)
    }
  }
  
  // add checkPassport() here
  async function checkPassport(currentAddress = address) {
    let score: number = await getPassportScore(currentAddress) as number
    let stampProviders = await getPassportStamps(currentAddress) as Array<string>
    let stamps: Array<Stamp> = []
    for (var i = 0; i < stampProviders.length; i++) {
      let s: Stamp = { id: i, stamp: stampProviders[i] }
      stamps.push(s)
    }
    const id = userInfo.length + 1
    let user: UserStruct = { id: id, address: currentAddress, score: score, stampProviders: stamps }
    console.log(user)
    if (userInfo.map(user => user.address).includes(currentAddress || currentAddress.toUpperCase())) {
      console.log("address already checked")
    } else {
      console.log("adding user to state var")
      console.log("userInfo", userInfo)
      setUserInfo(userInfo.concat(user))
    }
    console.log("userInfo", userInfo)
  }
  
  // add getPassportScore() here
  async function getPassportScore(currentAddress: string) {
    console.log("in getScore()")
    const GET_PASSPORT_SCORE_URI = `https://api.scorer.gitcoin.co/registry/score/${SCORERID}/${currentAddress}`
    try {
      const response = await fetch(GET_PASSPORT_SCORE_URI, {
        headers
      })
      const passportData = await response.json()
      if (passportData.score) {
        // if the user has a score, round it and set it in the local state
        const roundedScore = Math.round(passportData.score * 100) / 100
        return roundedScore
      } else {
        // if the user has no score, display a message letting them know to submit thier passport
        console.log('No score available, please add Stamps to your passport and then resubmit.')
      }
    } catch (err) {
      console.log('error: ', err)
    }
  }
  
  // add getPassportStamps() here
  async function getPassportStamps(currentAddress: string) {
    console.log("in getStamps()")
    const stampProviderArray = []
    const GET_PASSPORT_STAMPS_URI = `https://api.scorer.gitcoin.co/registry/stamps/${currentAddress}`
    try {
      const response: Response = await fetch(GET_PASSPORT_STAMPS_URI, { headers })
      const data = await response.json()
      // parse stamp data from json
      for (const i of data.items) {
        stampProviderArray.push(i.credential.credentialSubject.provider)
      }
      console.log(stampProviderArray)
      return(stampProviderArray)
    } catch (err) {
      console.log('error: ', err)
    }
  }
 
  // add updateShowTrusted() here
  const updateShowTrusted = () => {
    setTrustedUsers(checkTrustedUsers())
    if (showTrusted === false) {
      setShowTrusted(true)
    } else {
      setShowTrusted(false)
    }
  }
    
  // add updateShowStamps() here
  const updateShowStamps = () => {
    if (showStamps === false) {
      setShowStamps(true)
      console.log("stamps = true")
    } else {
      setShowStamps(false)
      console.log("stamps = false")
    }
  }
  
  // add checkTrustedUsers() here
  /*
  function checkTrustedUsers() {
    return userInfo.filter(user => user.stampProviders.filter(
      provider => provider.stamp.includes('Ens')
        && (provider.stamp.includes("GnosisSafe"))
    )
    ).filter(user => user.score > 20)
  }
  */

  function checkTrustedUsers() {
    return userInfo.filter(user => 
      user.score > 20 &&
      user.stampProviders.some(provider => provider.stamp.includes('Github')) &&
      user.stampProviders.some(provider => provider.stamp.includes('Lens'))
    );
  }
 


  const styles = {
    main: {
      width: '900px',
      margin: '0 auto',
      paddingTop: 90
    }
  }
 
  return (
    /* this is the UI for the app */
    <div style={styles.main}>
      <ChakraProvider>
        <Heading as='h1' size='4xl' noOfLines={1}>Are you a trusted user?</Heading>
        <Text as='b'>If you have a score above 20, a Github Stamp AND a Lens Stamp, you are a trusted user!</Text>
        <Stack spacing={3} direction='row' align='center' marginTop={30}>
          <Button colorScheme='teal' variant='outline' onClick={connect}>Connect</Button>
          <Button colorScheme='teal' variant='outline' onClick={submitPassport}>Submit Passport</Button>
          <Button colorScheme='teal' variant='outline' onClick={updateShowTrusted}>Check Users</Button>
          <Checkbox colorScheme='telegram' onChange={updateShowStamps}>Show Stamps</Checkbox>
        </Stack>
        <div>
          <br />
          {showTrusted && <h3><b>Trusted users</b></h3>}
          <br />
          {showTrusted && trustedUsers.map(user => <ul key={user.id}> {user.address} </ul>)}
        </div>
        {showStamps &&
          <SimpleGrid columns={3} spacing='10px' marginTop={30}>
          {showTrusted && showStamps && trustedUsers.map(user => user.stampProviders.map(s => <Badge key={s.id} colorScheme='green'>{s.stamp}:{user.address.substring(0, 5)}</Badge>))}
        </SimpleGrid>}
      </ChakraProvider >
    </div >
  )
}