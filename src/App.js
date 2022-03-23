import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { ethers } from 'ethers';
import contractAbi from './utils/Domains.json'
import { networks } from './utils/networks';
import { mnemonicToSeed } from 'ethers/lib/utils';

// Constants
const TWITTER_HANDLE = 'kushagra_shiv';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = ".monkey";
const CONTRACT_ADDRESS = "0x59E2eFEf4D51560ddc31E8EB319aAA474c760c40";

const App = () => {
	const [currentAccount, setCurrentAccount] = useState("");
	const [domain, setDomain] = useState("");
	const [record, setRecord] = useState("");
	const [network, setNetwork] = useState("");
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState(false);
	const [mints, setMints] = useState([]);

	const connectWallet = async () => {
		try {
			const { ethereum } = window;
			if (!ethereum) {
				alert("Get MetaMask -> https://metamask.io");
				return;
			}
			const accounts = await ethereum.request({ method: "eth_requestAccounts" });
			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch (err) {
			console.log(err);
		}
	}

	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;
		if (!ethereum) {
			console.log("Make sure you have metamask!");
		} else {
			console.log("We have an ethereum object", ethereum);
		}
		const accounts = await ethereum.request({ method: "eth_accounts" });
		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log("Found an authorized account", account);
			setCurrentAccount(account);
		} else {
			console.log("No authorized account found!");
		}
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on("chainChanged", handleChainChanged);
		function handleChainChanged(_chainId) {
			window.location.reload();
		}
	}

	const switchNetworks = async () => {
		if (window.ethereum) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881' }],
				});
			} catch (err) {
				if (err.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_switchEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Testnet',
									rpcUrls: ['https://matic-mumbai.chainstacklabs.com'],
									nativeCurrency: {
										name: 'Matic',
										symbol: 'MATIC',
										decimals: 18
									},
									blockExplorerUrls: ['https://mumbai.polygonscan.com/']
								},
							],
						});
					} catch (err) {
						console.log(err);
					}
				}
				console.log(err);
			}
		} else {
			alert("Metamask is not installed! Please install it to use this app. https://metamask.io/download.html");
		}
	}

	const mintDomain = async () => {
		if (!domain) { return }
		if (domain.length < 3) {
			alert("Domain must be at least 3 characters long");
			return;
		}
		const price = domain.length === 3 ? "0.5" : domain.length === 4 ? "0.3" : "0.1";
		console.log("Minting domain", domain, "with price", price);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
				console.log("Gonna pop wallet to pay gas!");

				let tx = await contract.register(domain, { value: ethers.utils.parseEther(price) });
				const receipt = await tx.wait();
				if (receipt.status === 1) {
					console.log("Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash);
					tx = await contract.setRecord(domain, record);
					await tx.wait();
					console.log("Record set! https://mumbai.polygonscan.com/tx/" + tx.hash);
					alert(`New domain minted! https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mints[mints.length - 1].id + 1}`)
					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');
				} else {
					alert("Transaction failed! Please try again!")
				}
			}
		} catch (err) {
			console.log(err);
		}
	}

	const updateDomain = async () => {
		if (!record || !domain) { return }
		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log("Record set https://mumbai.polygonscan.com/tx/" + tx.hash);

				fetchMints();
				setRecord("");
				setDomain("");
			}
		} catch (err) {
			console.log(err);
		}
		setLoading(false);
	}

	const fetchMints = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				const names = await contract.getAllNames();
				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));
				console.log("Mints fetched! ", mintRecords);
				setMints(mintRecords);
			}
		} catch (err) {
			console.log(err);
		}
	}

	const renderNotConnectedContainer = () => (
		<div className='connect-wallet-container'>
			<img src='https://media.giphy.com/media/pFwRzOLfuGHok/giphy.gif' alt='monkey gif' />
			<button className='cta-button connect-wallet-button' onClick={connectWallet}>
				Connect Wallet
			</button>
		</div>
	)

	const renderInputForm = () => {
		if (!network.includes('Polygon')) {
			return (
				<div className="connect-wallet-container">
					<p>Please connect to the Polygon Mumbai Testnet</p>
					<button className='cta-button mint-button' onClick={switchNetworks}>Click here to switch</button>
				</div>
			);
		}

		return (
			<div className='form-container'>
				<div className='first-row'>
					<input
						type='text'
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'>{tld}</p>
				</div>
				<input
					type='text'
					value={record}
					placeholder="What are your monkey's traits?"
					onChange={e => setRecord(e.target.value)}
				/>
				{editing ? (
					<div className='button-container'>
						<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
							Set Data
						</button>
						<button className='cta-button mint-button' onClick={() => { setEditing(false) }}>
							Cancel
						</button>
					</div>
				) : (
					<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
						Mint
					</button>
				)}

			</div>
		)
	}

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className='mint-container'>
					<p className='subtitle'>Recently Minted Domains!</p>
					<div className='mint-list'>
						{mints.map((mint, index) => {
							return (
								<div className='mint-item' key={index}>
									<div className='mint-row'>
										<a className='link' href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target='_blank' rel='noopener noreferrer'>
											<p className='underlined'>{' '}{mint.name}{tld}{' '}</p>
										</a>
										{mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className='edit-button' onClick={() => editRecord(mint.name)}>
												<img className='edit-icon' src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
									<p>{mint.record}</p>
								</div>
							)
						})}
					</div>
				</div>
			)
		}
	}

	const editRecord = (name) => {
		console.log("Editing record for:", name);
		setEditing(true);
		setDomain(name);
	}

	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);

	useEffect(() => {
		if (network.includes("Polygon")) {
			fetchMints();
		}
	}, [currentAccount, network]);

	return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
						<div className="left">
							<p className="title">🐒Monkey Domain Service🐒</p>
							<p className="subtitle">Get your own NFT monkey domain!</p>
						</div>
						<div className="right">
							<img className="logo" alt="network logo" src={network.includes("Polygon") ? polygonLogo : ethLogo} />
							{currentAccount ? <p>Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</p> : <p>Not Connected</p>}
						</div>
					</header>
				</div>
				{!currentAccount && renderNotConnectedContainer()}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}
				<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
