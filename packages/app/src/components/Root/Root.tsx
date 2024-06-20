import {
  Link,
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  SidebarScrollWrapper,
  SidebarSpace,
  sidebarConfig,
  useSidebarOpenState,
} from '@backstage/core-components';
import { SidebarSearchModal } from '@backstage/plugin-search';
import {
  Settings as SidebarSettings,
  UserSettingsSignInAvatar,
} from '@backstage/plugin-user-settings';
import { makeStyles, SvgIcon } from '@material-ui/core';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import ExtensionIcon from '@material-ui/icons/Extension';
import HomeIcon from '@material-ui/icons/Home';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import MenuIcon from '@material-ui/icons/Menu';
import MapIcon from '@material-ui/icons/MyLocation';
import SearchIcon from '@material-ui/icons/Search';
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

const InfraWalletLogo = () => {
  return (
    <SvgIcon x="0px" y="0px" viewBox="0 0 24 24">
      <g>
        <g>
          <g>
            <g>
              <path fill="#E8EAED;" d="M10.37,4.55c0.02,0.01,0.04,0.03,0.06,0.04c0.37-0.52,0.86-0.88,1.42-1.04c0.3-0.08,0.61-0.1,0.93-0.07
					c-0.09-0.07-0.17-0.14-0.26-0.19c-0.41-0.28-0.83-0.42-1.22-0.42c-0.2,0-0.38,0.04-0.56,0.11C10.29,3.18,9.94,3.6,9.74,4.2
					C9.95,4.29,10.16,4.41,10.37,4.55z"/>
              <path fill="#E8EAED;" d="M20.47,7c-0.4-0.28-0.78-0.39-1.1-0.32l-0.5,0.11L18.72,6.3c-0.42-1.45-1.24-2.73-2.18-3.41
					c-0.57-0.41-1.15-0.57-1.63-0.44c-0.44,0.12-0.8,0.48-1.05,1.03l-0.13,0.29C13.97,3.87,14.2,4,14.42,4.17
					c1.04,0.75,1.93,2.06,2.45,3.57c0.48,0.02,0.98,0.2,1.46,0.54c1.61,1.12,2.8,3.85,2.78,6.33c0,0.15-0.01,0.29-0.02,0.43
					c0.27,0.06,0.51,0.03,0.73-0.09c0.57-0.34,0.93-1.31,0.95-2.53C22.79,10.3,21.78,7.92,20.47,7z"/>
            </g>
          </g>
          <g>
            <path fill="#E8EAED;" d="M17.7,9.18c-0.4-0.28-0.78-0.39-1.1-0.32l-0.5,0.11l-0.14-0.49c-0.42-1.45-1.24-2.73-2.18-3.41
				c-0.57-0.41-1.15-0.57-1.63-0.44c-0.44,0.12-0.8,0.48-1.05,1.03l-0.13,0.29c0.23,0.11,0.46,0.24,0.69,0.41
				c1.04,0.75,1.93,2.06,2.45,3.57c0.48,0.02,0.98,0.2,1.46,0.54c1.61,1.12,2.8,3.85,2.78,6.33c0,0.15-0.01,0.29-0.02,0.43
				c0.27,0.06,0.51,0.03,0.73-0.09c0.57-0.34,0.93-1.31,0.95-2.53C20.02,12.47,19.01,10.1,17.7,9.18z"/>
            <path fill="#E8EAED;" d="M7.61,6.73c0.02,0.01,0.04,0.03,0.06,0.04c0.37-0.52,0.86-0.88,1.42-1.04c0.3-0.08,0.61-0.1,0.93-0.07
				C9.93,5.59,9.84,5.53,9.75,5.47C9.34,5.19,8.92,5.05,8.54,5.05c-0.2,0-0.38,0.04-0.56,0.11c-0.45,0.19-0.8,0.62-1.01,1.22
				C7.18,6.47,7.4,6.59,7.61,6.73z"/>
          </g>
          <g>
            <path fill="#E8EAED;" d="M4.84,8.9C4.86,8.92,4.88,8.93,4.9,8.94c0.37-0.52,0.86-0.88,1.42-1.04c0.3-0.08,0.61-0.1,0.93-0.07
				C7.16,7.77,7.08,7.71,6.99,7.65C6.58,7.37,6.16,7.23,5.77,7.23c-0.2,0-0.38,0.04-0.56,0.11c-0.45,0.19-0.8,0.62-1.01,1.22
				C4.42,8.65,4.63,8.76,4.84,8.9z"/>
            <path fill="#E8EAED;" d="M14.94,11.36L14.94,11.36c-0.4-0.28-0.78-0.39-1.1-0.32l-0.5,0.11l-0.14-0.49
				c-0.42-1.45-1.24-2.73-2.18-3.41C10.44,6.83,9.86,6.67,9.38,6.8c-0.44,0.12-0.8,0.48-1.05,1.03L8.21,8.12
				C8.44,8.22,8.67,8.36,8.9,8.52c1.04,0.75,1.93,2.06,2.45,3.57c0.48,0.02,0.98,0.2,1.46,0.54c1.61,1.12,2.8,3.84,2.78,6.33
				c0,0.15-0.01,0.29-0.02,0.43c0.27,0.06,0.51,0.03,0.73-0.09c0.57-0.34,0.93-1.31,0.95-2.53C17.26,14.65,16.25,12.27,14.94,11.36z
				"/>
          </g>
          <path fill="#E8EAED;" d="M11.92,19.4c-1.68-0.82-1.4-1.4-1.49-2.52v-0.16c0-0.95,0.67-1.37,1.49-0.93l2.32,1.24
			c-0.37-1.49-1.14-2.86-2.07-3.5l0,0c-0.4-0.28-0.78-0.39-1.1-0.32l-0.5,0.11l-0.14-0.49C10,11.37,9.19,10.1,8.25,9.42
			C7.67,9,7.09,8.85,6.61,8.98c-0.44,0.12-0.8,0.48-1.05,1.03l-0.31,0.71l-0.57-0.53c-0.15-0.14-0.3-0.26-0.46-0.36
			C3.81,9.55,3.39,9.4,3.01,9.4c-0.2,0-0.38,0.04-0.56,0.11c-0.57,0.24-0.98,0.86-1.14,1.74c-0.38,2.05,0.73,4.62,2.38,5.5
			l8.71,4.65c0.43,0.23,0.81,0.25,1.13,0.06c0.27-0.16,0.49-0.46,0.65-0.86L11.92,19.4z"/>

          <ellipse transform="matrix(0.9086 -0.4176 0.4176 0.9086 -6.3391 6.8809)" fill="#E8EAED;" cx="12.55" cy="17.93" rx="0.63" ry="0.98" />
        </g>
      </g>
    </SvgIcon>
  );
}

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        {/* Global nav, not org-specific */}
        <SidebarItem icon={HomeIcon} to="catalog" text="Home" />
        <SidebarItem icon={ExtensionIcon} to="api-docs" text="APIs" />
        <SidebarItem icon={LibraryBooks} to="docs" text="Docs" />
        <SidebarItem icon={CreateComponentIcon} to="create" text="Create..." />
        {/* End global nav */}
        <SidebarDivider />
        <SidebarScrollWrapper>
          <SidebarItem icon={MapIcon} to="tech-radar" text="Tech Radar" />
          <SidebarItem
            icon={InfraWalletLogo}
            to="infrawallet"
            text="InfraWallet"
          />
        </SidebarScrollWrapper>
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <SidebarGroup
        label="Settings"
        icon={<UserSettingsSignInAvatar />}
        to="/settings"
      >
        <SidebarSettings />
      </SidebarGroup>
    </Sidebar>
    {children}
  </SidebarPage>
);
