import {
  Link,
  Sidebar,
  SidebarDivider,
  SidebarItem,
  SidebarPage,
  SidebarSpace,
  sidebarConfig,
  useSidebarOpenState,
} from '@backstage/core-components';
import { InfraWalletIcon } from '@electrolux-oss/plugin-infrawallet';
import { styled } from '@mui/material/styles';
import BuildIcon from '@mui/icons-material/Build';
import { PropsWithChildren, default as React } from 'react';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';

const SidebarLogoRoot = styled('div')(() => ({
  width: sidebarConfig.drawerWidthClosed,
  height: 3 * sidebarConfig.logoHeight,
  display: 'flex',
  flexFlow: 'row nowrap',
  alignItems: 'center',
  marginBottom: -14,
}));

const SidebarLogoLink = styled(Link)(() => ({
  width: sidebarConfig.drawerWidthClosed,
  marginLeft: 24,
}));

const SidebarLogo = () => {
  const { isOpen } = useSidebarOpenState();

  return (
    <SidebarLogoRoot>
      <SidebarLogoLink to="/" underline="none" aria-label="Home">
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </SidebarLogoLink>
    </SidebarLogoRoot>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarDivider />
      <SidebarItem icon={InfraWalletIcon} to="infrawallet" text="InfraWallet" />
      <SidebarSpace />
      <SidebarDivider />
      <SidebarItem icon={BuildIcon} to="devtools" text="DevTools" />
    </Sidebar>
    {children}
  </SidebarPage>
);
