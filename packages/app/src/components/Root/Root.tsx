import {
  Link,
  Sidebar,
  SidebarDivider,
  SidebarItem,
  SidebarPage,
  sidebarConfig,
  useSidebarOpenState,
} from '@backstage/core-components';
import { InfraWalletIcon } from '@electrolux-oss/plugin-infrawallet';
import { makeStyles } from '@material-ui/core';
import React, { PropsWithChildren } from 'react';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';

const useSidebarLogoStyles = makeStyles({
  root: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
});

const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.root}>
      <Link to="/" underline="none" className={classes.link} aria-label="Home">
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarDivider />
      <SidebarItem icon={InfraWalletIcon} to="infrawallet" text="InfraWallet" />
    </Sidebar>
    {children}
  </SidebarPage>
);
