"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import {
  initializeServices,
  DIDService,
  IPFSService,
  CredentialIssuanceService,
  CredentialVerificationService,
  ServiceConfig
} from "@/lib/services";

interface ServiceContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  didService: DIDService | null;
  ipfsService: IPFSService | null;
  issuanceService: CredentialIssuanceService | null;
  verificationService: CredentialVerificationService | null;
  initialized: boolean;
  initialize: (signer: ethers.Signer, address: string) => Promise<void>;
  disconnect: () => void;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [didService, setDidService] = useState<DIDService | null>(null);
  const [ipfsService, setIpfsService] = useState<IPFSService | null>(null);
  const [issuanceService, setIssuanceService] = useState<CredentialIssuanceService | null>(null);
  const [verificationService, setVerificationService] = useState<CredentialVerificationService | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);
      
      const ipfsConfig = {
        host: process.env.NEXT_PUBLIC_IPFS_HOST || "ipfs.infura.io",
        port: 5001,
        protocol: "https",
        projectId: process.env.NEXT_PUBLIC_IPFS_PROJECT_ID,
        projectSecret: process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET
      };

      const services = initializeServices({
        provider,
        ipfsConfig
      });

      setDidService(services.didService);
      setIpfsService(services.ipfsService);
      setVerificationService(services.verificationService);
      setInitialized(true);
    }
  }, []);

  const initialize = async (newSigner: ethers.Signer, address: string) => {
    if (!provider) {
      throw new Error("Provider not initialized");
    }

    setSigner(newSigner);

    const ipfsConfig = {
      host: process.env.NEXT_PUBLIC_IPFS_HOST || "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      projectId: process.env.NEXT_PUBLIC_IPFS_PROJECT_ID,
      projectSecret: process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET
    };

    const services = initializeServices({
      provider,
      signer: newSigner,
      ipfsConfig
    });

    setDidService(services.didService);
    setIpfsService(services.ipfsService);
    setIssuanceService(services.issuanceService || null);
    setVerificationService(services.verificationService);
    setInitialized(true);
  };

  const disconnect = () => {
    setSigner(null);
    setIssuanceService(null);
  };

  return (
    <ServiceContext.Provider
      value={{
        provider,
        signer,
        didService,
        ipfsService,
        issuanceService,
        verificationService,
        initialized,
        initialize,
        disconnect
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useServices() {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error("useServices must be used within a ServiceProvider");
  }
  return context;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

